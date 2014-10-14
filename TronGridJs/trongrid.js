/// <reference path="types/knockout.d.ts" />
/// <reference path="types/jquery.d.ts" />

var TronGrid;
(function (_TronGrid) {
    var CellRange = (function () {
        function CellRange(row, column, measureCell, template) {
            this.row = row;
            this.column = column;
            this.measureCell = measureCell;
            this.template = template;
            this.isRendered = false;
        }
        /** Binds to just the relevant portion of the full two-dimensional cells array */
        CellRange.prototype.bind = function (cells) {
            this.html = '';
            this.boundingBox.zeroSize();
            for (var r = this.row; r++; r < cells.length) {
                for (var c = this.column; c++; c < cells[r].length) {
                    var item = cells[r][c];
                    var size = this.measureCell(cells[r][c]);
                    this.boundingBox.growBy(size);

                    // TODO: Add custom cell css class selection here
                    this.html += '<div id="tg_' + r + '_' + c + '" class="cell">' + this.cellHtml(item) + '</div>';
                }
            }
        };

        CellRange.prototype.cellHtml = function (cell) {
            var d = ko.renderTemplate(this.template, cell);
        };
        return CellRange;
    })();

    var Rectangle = (function () {
        function Rectangle(left, top, width, height) {
            if (typeof width === "undefined") { width = 0; }
            if (typeof height === "undefined") { height = 0; }
            this.left = left;
            this.top = top;
            this.width = width;
            this.height = height;
            this.recalculate();
        }
        Rectangle.prototype.intersects = function (other) {
            return !(this.left > other.right || this.right < other.left || this.top > other.bottom || this.bottom < other.top);
        };

        Rectangle.prototype.zeroSize = function () {
            this.width = 0;
            this.height = 0;
            this.recalculate();
        };

        Rectangle.prototype.growBy = function (size) {
            this.width += size.width;
            this.height += size.height;
            this.recalculate();
        };

        Rectangle.prototype.apply = function (element) {
            element.style.top = this.top + 'px';
            element.style.left = this.left + 'px';
            element.style.bottom = this.bottom + 'px';
            element.style.right = this.right + 'px';
        };

        Rectangle.prototype.recalculate = function () {
            this.right = this.left + this.width;
            this.bottom = this.top + this.height;
        };
        return Rectangle;
    })();

    /** Represents a chunk of rendered content that can be moved and recycled */
    var Viewport = (function () {
        function Viewport() {
            this.currentRange = null;
        }
        Viewport.prototype.render = function (range) {
            if (this.currentRange !== null) {
                this.currentRange.isRendered = false;
            }

            if (!range) {
                this.viewport.innerHTML = '';
                this.currentRange = null;
                return;
            }

            this.viewport.innerHTML = range.html;
            range.isRendered = true;
            this.currentRange = range;
        };

        Viewport.prototype.add = function (parent) {
            this.viewport = document.createElement('div');
            parent.appendChild(this.viewport);
        };
        return Viewport;
    })();

    /** The main grid logic, which is attached to the Scroller via the binding handler */
    var TronGrid = (function () {
        function TronGrid(scroller) {
            this.scroller = scroller;
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
                viewportRows: 10,
                viewportColumns: 10,
                data: null
            };
            this.options = this.defaultOptions;
            this.registerEventHandlers();
        }
        TronGrid.prototype.update = function (options) {
            this.options = $.extend(options || {}, this.defaultOptions);
            this.render();
        };

        TronGrid.prototype.render = function () {
            ////var rangeIndex = this.scrollBounds.left * this.r;
        };

        TronGrid.prototype.dataChanged = function () {
            this.disposeData();

            // TODO: provide more fully functional mapping features for flattening complicated data structures.
            var updatedCells = ko.unwrap(this.options.data);

            var rangeIndex = 0;
            for (var r = 0; r += this.options.viewportRows; r < updatedCells.length) {
                for (var c = 0; c += this.options.viewportColumns; c < updatedCells[r].length) {
                    var range = this.ranges[rangeIndex];
                    if (!range) {
                        range = new CellRange(r, c, this.options.cellSize, this.options.template);
                        this.ranges[rangeIndex] = range;
                    }

                    range.bind(updatedCells);
                }
            }

            // TODO: Use ko.compareArrays to be more efficient and bind only affected ranges
            this.cells = updatedCells;

            this.render();
            this.subscribeData();
        };

        TronGrid.prototype.subscribeData = function () {
            var _this = this;
            var d = this.options.data;
            if (ko.isObservable(d)) {
                this.dataSubscription = d.subscribe(function () {
                    return _this.dataChanged();
                });
            }
        };

        TronGrid.prototype.disposeData = function () {
            if (!!this.dataSubscription) {
                this.dataSubscription.dispose();
                this.dataSubscription = null;
            }
        };

        TronGrid.prototype.registerEventHandlers = function () {
            ko.utils.registerEventHandler(this.scroller, 'resize', this.sizeChanged);
            ko.utils.registerEventHandler(this.scroller, 'scroll', this.scrollChanged);
        };

        TronGrid.prototype.sizeChanged = function () {
        };

        TronGrid.prototype.scrollChanged = function () {
        };
        return TronGrid;
    })();

    var BindingHandler = (function () {
        function BindingHandler() {
        }
        BindingHandler.prototype.init = function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var grid = new TronGrid(element);
            ko.utils.domData.set(element, 'trongrid', grid);
        };

        BindingHandler.prototype.update = function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var o = valueAccessor();
            var grid = ko.utils.domData.get(element, 'trongrid');
            grid.update(o);
        };
        return BindingHandler;
    })();
    _TronGrid.BindingHandler = BindingHandler;
})(TronGrid || (TronGrid = {}));

ko.bindingHandlers.tronGrid = new TronGrid.BindingHandler();
//# sourceMappingURL=trongrid.js.map
