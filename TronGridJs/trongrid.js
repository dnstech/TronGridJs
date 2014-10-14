/// <reference path="types/knockout.d.ts" />
/// <reference path="types/jquery.d.ts" />

var TronGridCellRange = (function () {
    function TronGridCellRange(row, column) {
        this.row = row;
        this.column = column;
        this.isRendered = false;
    }
    /** Binds to just the relevant portion of the full two-dimensional cells array */
    TronGridCellRange.prototype.bind = function (cells) {
        this.html = '';
        for (var r = this.row; r++; r < cells.length) {
            for (var c = this.column; c++; c < cells[r].length) {
                var item = cells[r][c];

                // TODO: Add custom cell css class selection here
                this.html += '<div id="tg_' + r + '_' + c + '" class="cell">' + item + '</div>';
            }
        }
    };
    return TronGridCellRange;
})();

var TronGridCellRangeViewport = (function () {
    function TronGridCellRangeViewport() {
        this.currentRange = null;
    }
    TronGridCellRangeViewport.prototype.render = function (range) {
        if (this.currentRange !== null) {
            this.currentRange.isRendered = false;
        }

        this.viewport.style.top = range.y + 'px';
        this.viewport.style.left = range.x + 'px';
        this.viewport.style.width = range.width + 'px';
        this.viewport.style.height = range.height + 'px';
        this.viewport.innerHTML = range.html;
        range.isRendered = true;
        this.currentRange = range;
    };

    TronGridCellRangeViewport.prototype.add = function (parent) {
        this.viewport = document.createElement('div');
        parent.appendChild(this.viewport);
    };
    return TronGridCellRangeViewport;
})();

var TronGrid = (function () {
    function TronGrid(element) {
        var _this = this;
        this.defaultOptions = {
            orientation: 'rows',
            cellSize: function (item) {
                return {
                    width: 100,
                    height: 25
                };
            },
            template: function (item) {
                return null;
            },
            data: null
        };
        this.options = this.defaultOptions;
        ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
            return _this.dispose();
        });
    }
    TronGrid.prototype.update = function (options) {
        this.options = $.extend(options || {}, this.defaultOptions);
        this.render();
    };

    TronGrid.prototype.render = function () {
        var _this = this;
        var d = this.options.data;
        if (ko.isObservable(d)) {
            this.dataSubscription = d.subscribe(function () {
                return _this.dataChanged();
            });
        }
    };

    TronGrid.prototype.dataChanged = function () {
    };

    TronGrid.prototype.dispose = function () {
        if (!!this.dataSubscription) {
            this.dataSubscription.dispose();
            this.dataSubscription = null;
        }
    };
    return TronGrid;
})();

var TronGridBindingHandler = (function () {
    function TronGridBindingHandler() {
    }
    TronGridBindingHandler.prototype.init = function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var grid = new TronGrid(element);
        $(element).data('trongrid', grid);
    };

    TronGridBindingHandler.prototype.update = function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var o = valueAccessor();
        var grid = $(element).data('trongrid');
        grid.update(o);
    };
    return TronGridBindingHandler;
})();

ko.bindingHandlers.tronGrid = new TronGridBindingHandler();
//# sourceMappingURL=trongrid.js.map
