var TronGrid;
(function (TronGrid) {
    var TouchScrollBehavior = (function () {
        function TouchScrollBehavior(log) {
            this.log = log;
            /** Measured in pixels per frame (or 1/30th of a second) */
            this.scrollDeltaX = 0;
            /** Measured in pixels per frame (or 1/30th of a second) */
            this.scrollDeltaY = 0;
            /** Interval subscription */
            this.scrollPrediction = null;
            this.scrollTimestamp = 0;
            this.lastTouchX = 0;
            this.lastTouchY = 0;
        }
        TouchScrollBehavior.prototype.attach = function (attachToGrid) {
            if (!!this.grid) {
                throw "This behavior has already been attached to a grid";
            }

            this.grid = attachToGrid;
            ko.utils.registerEventHandler(this.grid.scroller, 'touchmove', this.touchMove.bind(this));
            ko.utils.registerEventHandler(this.grid.scroller, 'touchend', this.touchEnd.bind(this));
            ko.utils.registerEventHandler(this.grid.scroller, 'touchleave', this.touchEnd.bind(this));
            ko.utils.registerEventHandler(this.grid.scroller, 'scroll', this.stopScrollPrediction.bind(this));

            // This is the magic, this gives me "live" scroll events
            ko.utils.registerEventHandler(this.grid.scroller, 'gesturechange', function () {
            });
        };

        TouchScrollBehavior.prototype.touchMove = function () {
            var e = event;
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
        };

        TouchScrollBehavior.prototype.touchEnd = function () {
            this.startScrollPrediction();
        };

        TouchScrollBehavior.prototype.stopScrollPrediction = function () {
            if (this.scrollPrediction !== null) {
                clearInterval(this.scrollPrediction);
                this.scrollPrediction = null;
            }
        };

        TouchScrollBehavior.prototype.startScrollPrediction = function () {
            var _this = this;
            this.stopScrollPrediction();
            if (this.scrollDeltaX !== 0 && this.scrollDeltaY !== 0) {
                return;
            }

            this.scrollPrediction = setInterval(function () {
                var b = _this.grid.scrollBounds;
                var newBounds = new TronGrid.Rectangle(_this.scrollDeltaX > 0 ? b.left : Math.max(0, b.left - _this.scrollDeltaX), _this.scrollDeltaY > 0 ? b.top : Math.max(0, b.top - _this.scrollDeltaY), _this.scrollDeltaX > 0 ? b.width + _this.scrollDeltaX : b.width, _this.scrollDeltaY > 0 ? b.height + _this.scrollDeltaY : b.height);
                _this.log.push('Expanded from ' + _this.grid.scrollBounds.toString() + ' to ' + newBounds.toString());

                _this.grid.scrollBounds = newBounds;
                _this.grid.enqueueRender();
            }, 1000 / 30);
        };
        return TouchScrollBehavior;
    })();
    TronGrid.TouchScrollBehavior = TouchScrollBehavior;
})(TronGrid || (TronGrid = {}));
//# sourceMappingURL=touchscroll-trongrid.js.map
