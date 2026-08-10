export default function UI({
  bgLabel,
  rabbidIndex,
  rabbidCount,
  onPrevBackground,
  onNextBackground,
  onPrevRabbid,
  onNextRabbid,
  onWarmPrevBackground,
  onWarmNextBackground,
  onWarmPrevRabbid,
  onWarmNextRabbid,
}) {
  const pad = (n) => String(n).padStart(2, '0');
  const warmEvents = (handler) => ({
    onPointerEnter: handler,
    onFocus: handler,
    onTouchStart: handler,
  });

  return (
    <div className="ui-overlay">
      <div className="ui-title">
        <h1 className="ui-title-line">RABBIDS</h1>
        <h1 className="ui-title-line">INVASION</h1>
      </div>

      <div className="ui-controls">
        <div className="ui-control-group">
          <span className="ui-label">BACKGROUND</span>
          <div className="ui-selector">
            <button
              type="button"
              className="ui-arrow"
              onClick={onPrevBackground}
              {...warmEvents(onWarmPrevBackground)}
              aria-label="Previous background"
            >
              &#8592;
            </button>
            <span className="ui-index">{bgLabel}</span>
            <button
              type="button"
              className="ui-arrow"
              onClick={onNextBackground}
              {...warmEvents(onWarmNextBackground)}
              aria-label="Next background"
            >
              &#8594;
            </button>
          </div>
        </div>

        <div className="ui-control-group">
          <span className="ui-label">RABBID</span>
          <div className="ui-selector">
            <button
              type="button"
              className="ui-arrow"
              onClick={onPrevRabbid}
              {...warmEvents(onWarmPrevRabbid)}
              aria-label="Previous rabbid"
            >
              &#8592;
            </button>
            <span className="ui-index">
              R {pad(rabbidIndex + 1)} / {pad(rabbidCount)}
            </span>
            <button
              type="button"
              className="ui-arrow"
              onClick={onNextRabbid}
              {...warmEvents(onWarmNextRabbid)}
              aria-label="Next rabbid"
            >
              &#8594;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
