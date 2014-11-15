
module TronGrid {
    export class TouchScrollBehavior implements IGridBehavior {
        private grid: TronGrid;

        constructor(private log: KnockoutObservableArray<string>) {

        }
        /** Measured in pixels per frame (or 1/30th of a second) */
        scrollDeltaX = 0;

        /** Measured in pixels per frame (or 1/30th of a second) */
        scrollDeltaY = 0;

        /** Interval subscription */
        scrollPrediction: number = null;
        scrollTimestamp = 0;
        lastTouchX = 0;
        lastTouchY = 0;

        attach(attachToGrid: TronGrid) {
            if (!!this.grid) {
                throw "This behavior has already been attached to a grid";
            }

            this.grid = attachToGrid;
            ko.utils.registerEventHandler(this.grid.scroller, 'touchmove', this.touchMove.bind(this));
            ko.utils.registerEventHandler(this.grid.scroller, 'touchend', this.touchEnd.bind(this));
            ko.utils.registerEventHandler(this.grid.scroller, 'touchleave', this.touchEnd.bind(this));
            ko.utils.registerEventHandler(this.grid.scroller, 'scroll', this.stopScrollPrediction.bind(this));

            // This is the magic, this gives me "live" scroll events
            ko.utils.registerEventHandler(this.grid.scroller, 'gesturechange', function () { });
        }

        touchMove() {
            var e = <any>event;
            if (!e.touches || !e.touches.length) {
                return;
            }

            var touchItem = e.touches[0];
            var deltaTime = 1;
            var t = e.timeStamp;
            if (this.scrollTimestamp !== 0) {
                deltaTime = t - this.scrollTimestamp;
                this.scrollDeltaX = ((touchItem.pageX - this.lastTouchX) * (deltaTime / (1000 / 30))) | 0;
                this.scrollDeltaY = ((touchItem.pageY - this.lastTouchY) * (deltaTime / (1000 / 30))) | 0;
                this.lastTouchX = touchItem.pageX | 0;
                this.lastTouchY = touchItem.pageY | 0;
                this.scrollTimestamp = t;
            } else {
                this.lastTouchX = touchItem.pageX | 0;
                this.lastTouchY = touchItem.pageY | 0;
                this.scrollTimestamp = t;
            }
        }

        touchEnd() {
            this.startScrollPrediction();
        }

        stopScrollPrediction() {
            if (this.scrollPrediction !== null) {
                clearInterval(this.scrollPrediction);
                this.scrollPrediction = null;
            }
        }

        startScrollPrediction() {
            this.stopScrollPrediction();
            if (this.scrollDeltaX !== 0 && this.scrollDeltaY !== 0) {
                return;
            }

            this.scrollPrediction = setInterval(() => {
                var b = this.grid.scrollBounds;
                var newBounds = new Rectangle(
                    this.scrollDeltaX > 0 ? b.left : Math.max(0, b.left - this.scrollDeltaX),
                    this.scrollDeltaY > 0 ? b.top : Math.max(0, b.top - this.scrollDeltaY),
                    this.scrollDeltaX > 0 ? b.width + this.scrollDeltaX : b.width,
                    this.scrollDeltaY > 0 ? b.height + this.scrollDeltaY : b.height);
                this.log.push('Expanded from ' + this.grid.scrollBounds.toString() + ' to ' + newBounds.toString());

                this.grid.scrollBounds = newBounds;
                this.grid.enqueueRender();
            }, 1000 / 30);
        }
    }
}