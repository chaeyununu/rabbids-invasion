param(
  [string]$InputDir = "public/models/backgrounds",
  [string]$OutputDir = "public/models/backgrounds-optimized",
  [int]$MaxDimension = 2048,
  [int]$JpegQuality = 72
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function Get-UInt32LE([byte[]]$Bytes, [int]$Offset) {
  return [BitConverter]::ToUInt32($Bytes, $Offset)
}

function Align4([System.IO.MemoryStream]$Stream) {
  while (($Stream.Position % 4) -ne 0) {
    $Stream.WriteByte(0)
  }
}

function Set-JsonProperty($Object, [string]$Name, $Value) {
  if ($Object.PSObject.Properties.Name -contains $Name) {
    $Object.$Name = $Value
  } else {
    $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
  }
}

function Get-JpegCodec {
  return [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq "image/jpeg" } |
    Select-Object -First 1
}

function Test-PngHasAlpha([byte[]]$Bytes) {
  if ($Bytes.Length -lt 33) {
    return $false
  }

  $signature = [byte[]](0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
  for ($i = 0; $i -lt $signature.Length; $i++) {
    if ($Bytes[$i] -ne $signature[$i]) {
      return $false
    }
  }

  $colorType = $Bytes[25]
  if ($colorType -eq 4 -or $colorType -eq 6) {
    return $true
  }

  $offset = 8
  while (($offset + 8) -le $Bytes.Length) {
    $lengthBytes = [byte[]]@($Bytes[$offset + 3], $Bytes[$offset + 2], $Bytes[$offset + 1], $Bytes[$offset])
    $length = [BitConverter]::ToUInt32($lengthBytes, 0)
    $type = [Text.Encoding]::ASCII.GetString($Bytes, $offset + 4, 4)
    if ($type -eq "tRNS") {
      return $true
    }
    $offset += 12 + [int]$length
  }

  return $false
}

function Save-ImageBytes(
  [System.Drawing.Image]$Source,
  [int]$TargetWidth,
  [int]$TargetHeight,
  [string]$MimeType,
  [int]$Quality
) {
  $pixelFormat = if ($MimeType -eq "image/png") {
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  } else {
    [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
  }

  $bitmap = New-Object System.Drawing.Bitmap $TargetWidth, $TargetHeight, $pixelFormat
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $output = New-Object System.IO.MemoryStream

  try {
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($MimeType -eq "image/jpeg") {
      $graphics.Clear([System.Drawing.Color]::Black)
    } else {
      $graphics.Clear([System.Drawing.Color]::Transparent)
    }

    $graphics.DrawImage($Source, 0, 0, $TargetWidth, $TargetHeight)

    if ($MimeType -eq "image/jpeg") {
      $codec = Get-JpegCodec
      $encoder = [System.Drawing.Imaging.Encoder]::Quality
      $encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters 1
      $encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter $encoder, ([int64]$Quality)
      try {
        $bitmap.Save($output, $codec, $encoderParameters)
      } finally {
        $encoderParameters.Dispose()
      }
    } else {
      $bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
    }

    return $output.ToArray()
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
    $output.Dispose()
  }
}

function Optimize-Image([byte[]]$Bytes, [string]$MimeType, [int]$MaxDim, [int]$Quality) {
  if ($MimeType -ne "image/jpeg" -and $MimeType -ne "image/png") {
    return [pscustomobject]@{
      Bytes = $Bytes
      MimeType = $MimeType
      Changed = $false
    }
  }

  $hasAlpha = $MimeType -eq "image/png" -and (Test-PngHasAlpha $Bytes)
  $targetMime = if ($hasAlpha) { "image/png" } else { "image/jpeg" }
  $input = New-Object System.IO.MemoryStream @(,$Bytes)
  $image = $null

  try {
    $image = [System.Drawing.Image]::FromStream($input, $false, $false)
    $largest = [Math]::Max($image.Width, $image.Height)
    $scale = if ($largest -gt $MaxDim) { $MaxDim / $largest } else { 1 }
    $targetWidth = [Math]::Max(1, [int][Math]::Round($image.Width * $scale))
    $targetHeight = [Math]::Max(1, [int][Math]::Round($image.Height * $scale))
    $optimized = Save-ImageBytes $image $targetWidth $targetHeight $targetMime $Quality

    if ($optimized.Length -lt $Bytes.Length) {
      return [pscustomobject]@{
        Bytes = $optimized
        MimeType = $targetMime
        Changed = $true
      }
    }

    return [pscustomobject]@{
      Bytes = $Bytes
      MimeType = $MimeType
      Changed = $false
    }
  } finally {
    if ($image -ne $null) {
      $image.Dispose()
    }
    $input.Dispose()
  }
}

function Read-Glb([string]$Path) {
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  $magic = [Text.Encoding]::ASCII.GetString($bytes, 0, 4)
  if ($magic -ne "glTF") {
    throw "Not a GLB file: $Path"
  }

  $offset = 12
  $jsonChunk = $null
  $binChunk = $null

  while ($offset -lt $bytes.Length) {
    $chunkLength = [int](Get-UInt32LE $bytes $offset)
    $chunkType = Get-UInt32LE $bytes ($offset + 4)
    $chunkStart = $offset + 8
    $chunk = New-Object byte[] $chunkLength
    [Array]::Copy($bytes, $chunkStart, $chunk, 0, $chunkLength)

    if ($chunkType -eq 0x4e4f534a) {
      $jsonChunk = $chunk
    } elseif ($chunkType -eq 0x004e4942) {
      $binChunk = $chunk
    }

    $offset = $chunkStart + $chunkLength
  }

  if ($jsonChunk -eq $null -or $binChunk -eq $null) {
    throw "Missing JSON or BIN chunk: $Path"
  }

  $jsonText = [Text.Encoding]::UTF8.GetString($jsonChunk).TrimEnd([char]0, [char]32, [char]9, [char]10, [char]13)
  $json = $jsonText | ConvertFrom-Json

  return [pscustomobject]@{
    Json = $json
    Bin = $binChunk
  }
}

function Write-Glb([string]$Path, $Json, [byte[]]$Bin) {
  $jsonText = $Json | ConvertTo-Json -Depth 100 -Compress
  $jsonBytes = [Text.Encoding]::UTF8.GetBytes($jsonText)
  $jsonStream = New-Object System.IO.MemoryStream

  try {
    $jsonStream.Write($jsonBytes, 0, $jsonBytes.Length)
    while (($jsonStream.Position % 4) -ne 0) {
      $jsonStream.WriteByte(0x20)
    }

    $binStream = New-Object System.IO.MemoryStream
    try {
      $binStream.Write($Bin, 0, $Bin.Length)
      Align4 $binStream

      $totalLength = 12 + 8 + [int]$jsonStream.Length + 8 + [int]$binStream.Length
      $output = New-Object System.IO.FileStream $Path, ([System.IO.FileMode]::Create), ([System.IO.FileAccess]::Write)
      try {
        $writer = New-Object System.IO.BinaryWriter $output
        try {
          $writer.Write([Text.Encoding]::ASCII.GetBytes("glTF"))
          $writer.Write([uint32]2)
          $writer.Write([uint32]$totalLength)
          $writer.Write([uint32]$jsonStream.Length)
          $writer.Write([uint32]0x4e4f534a)
          $writer.Write($jsonStream.ToArray())
          $writer.Write([uint32]$binStream.Length)
          $writer.Write([uint32]0x004e4942)
          $writer.Write($binStream.ToArray())
        } finally {
          $writer.Dispose()
        }
      } finally {
        $output.Dispose()
      }
    } finally {
      $binStream.Dispose()
    }
  } finally {
    $jsonStream.Dispose()
  }
}

function Optimize-Glb([string]$InputPath, [string]$OutputPath, [int]$MaxDim, [int]$Quality) {
  $glb = Read-Glb $InputPath
  $json = $glb.Json
  $bin = $glb.Bin
  $views = @($json.bufferViews)
  $images = @($json.images)
  $imageByView = @{}

  for ($i = 0; $i -lt $images.Count; $i++) {
    $viewIndex = [int]$images[$i].bufferView
    $imageByView[$viewIndex] = $i
  }

  $newBin = New-Object System.IO.MemoryStream
  $oldImageBytes = 0
  $newImageBytes = 0
  $changedImages = 0

  try {
    for ($viewIndex = 0; $viewIndex -lt $views.Count; $viewIndex++) {
      $view = $views[$viewIndex]
      $oldOffset = if ($view.PSObject.Properties.Name -contains "byteOffset") { [int]$view.byteOffset } else { 0 }
      $oldLength = [int]$view.byteLength
      $newBytes = $null

      if ($imageByView.ContainsKey($viewIndex)) {
        $imageIndex = [int]$imageByView[$viewIndex]
        $image = $images[$imageIndex]
        $oldBytes = New-Object byte[] $oldLength
        [Array]::Copy($bin, $oldOffset, $oldBytes, 0, $oldLength)
        $optimized = Optimize-Image $oldBytes ([string]$image.mimeType) $MaxDim $Quality
        $newBytes = [byte[]]$optimized.Bytes
        $image.mimeType = [string]$optimized.MimeType
        $oldImageBytes += $oldLength
        $newImageBytes += $newBytes.Length
        if ($optimized.Changed) {
          $changedImages += 1
        }
      }

      Set-JsonProperty $view "byteOffset" ([int]$newBin.Position)
      if ($newBytes -ne $null) {
        $newBin.Write($newBytes, 0, $newBytes.Length)
        $view.byteLength = [int]$newBytes.Length
      } else {
        $newBin.Write($bin, $oldOffset, $oldLength)
        $view.byteLength = $oldLength
      }

      Align4 $newBin
    }

    $json.buffers[0].byteLength = [int]$newBin.Length
    Write-Glb $OutputPath $json ($newBin.ToArray())

    return [pscustomobject]@{
      File = [System.IO.Path]::GetFileName($InputPath)
      OriginalBytes = (Get-Item $InputPath).Length
      OptimizedBytes = (Get-Item $OutputPath).Length
      OldImageBytes = $oldImageBytes
      NewImageBytes = $newImageBytes
      ChangedImages = $changedImages
    }
  } finally {
    $newBin.Dispose()
  }
}

$resolvedInput = (Resolve-Path -Path $InputDir).Path
if (-not (Test-Path -Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}
$resolvedOutput = (Resolve-Path -Path $OutputDir).Path

Get-ChildItem -Path $resolvedInput -Filter "*.glb" | ForEach-Object {
  $outputPath = Join-Path $resolvedOutput $_.Name
  Optimize-Glb $_.FullName $outputPath $MaxDimension $JpegQuality
} | Format-Table -AutoSize
