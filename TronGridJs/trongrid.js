/// <reference path="types/knockout.d.ts" />
/// <reference path="types/jquery.d.ts" />
// Binary search from https://gist.github.com/uberbrady/10605041

var TronGrid;
(function (_TronGrid) {
    var CellBlock = (function () {
        function CellBlock(firstRow, lastRow, firstColumn, lastColumn, parent, dataProvider, dataPresenter) {
            this.firstRow = firstRow;
            this.lastRow = lastRow;
            this.firstColumn = firstColumn;
            this.lastColumn = lastColumn;
            this.parent = parent;
            this.dataProvider = dataProvider;
            this.dataPresenter = dataPresenter;
            this.isRendered = false;
            this.isVisible = false;
        }
        CellBlock.prototype.show = function () {
            if (this.isRendered) {
                this.render();
            }

            if (this.isVisible)
                this.isVisible = true;
            this.parent.appendChild(this.block);
        };

        CellBlock.prototype.hide = function () {
            this.isVisible = false;
        };

        /** Binds to just the relevant portion of the full two-dimensional cells array */
        CellBlock.prototype.render = function () {
            if (!this.block) {
                this.block = document.createElement('div');
            } else {
                this.block.innerHTML = '';
            }

            for (var r = this.firstRow; r++; r < this.lastRow) {
                for (var c = this.firstColumn; c++; c < this.lastColumn) {
                    var cell = document.createElement('div');
                    cell.setAttribute('id', 'tg_' + r + '_' + c);
                    cell.setAttribute('class', 'cell');
                    var cellData = this.dataProvider.cellData(r, c);
                    this.dataPresenter.renderCell(cell, cellData, r, c);
                    this.block.appendChild(cell);
                }
            }

            this.isRendered = true;
        };
        return CellBlock;
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

    var TextPresenter = (function () {
        function TextPresenter() {
        }
        TextPresenter.prototype.renderCell = function (cell, data) {
            cell.innerText = data;
        };
        return TextPresenter;
    })();

    /** The main grid logic, which is attached to the Scroller via the binding handler */
    var TronGrid = (function () {
        function TronGrid(scroller) {
            this.scroller = scroller;
            this.defaultOptions = {
                dataProvider: null,
                dataPresenter: new TextPresenter(),
                rowsPerBlock: 10,
                columnsPerBlock: 10
            };
            this.options = this.defaultOptions;
            this.totalHeight = 0;
            this.totalWidth = 0;
            this.registerEventHandlers();
        }
        TronGrid.prototype.update = function (options) {
            this.options = $.extend(options || {}, this.defaultOptions);
            this.provider = this.options.dataProvider;
            this.presenter = this.options.dataPresenter;

            this.content = document.createElement('div');
            this.scroller.appendChild(this.content);
            this.dataChanged();
        };

        TronGrid.prototype.scrollChanged = function () {
            this.scrollBounds = new Rectangle(this.scroller.scrollLeft, this.scroller.scrollTop, this.scroller.scrollWidth, this.scroller.scrollHeight);
        };

        TronGrid.prototype.measure = function () {
            if (this.columnWidths.length !== this.provider.columnCount) {
                this.totalWidth = 0;
                for (var c = 0; c < this.columnWidths.length; c++) {
                    this.columnWidths[c] = this.provider.columnWidth(c);
                    this.totalWidth += this.columnWidths[c];
                }
            }

            if (this.rowHeights.length !== this.provider.rowCount) {
                this.totalHeight = 0;
                for (var r = 0; r < this.rowHeights.length; r++) {
                    this.rowHeights[r] = this.options.dataProvider.rowHeight(r);
                    this.totalHeight += this.rowHeights[r];
                }
            }

            this.content.style.width = this.totalWidth + 'px';
            this.content.style.height = this.totalHeight + 'px';
        };

        TronGrid.prototype.render = function () {
            var rangeIndex = this.scrollBounds.left;
            var blockIndex = 0;
            for (var r = 0; r < this.provider.rowCount; r += this.options.rowsPerBlock) {
                for (var c = 0; c < this.provider.columnCount; r += this.options.columnsPerBlock) {
                    var b = this.blocks[blockIndex];
                    if (!b) {
                        b = new CellBlock(r, r + this.options.rowsPerBlock, c, c + this.options.columnsPerBlock, this.content, this.provider, this.presenter);
                        this.blocks[blockIndex] = b;
                    }

                    if (b.boundingBox.intersects(this.scrollBounds)) {
                        b.show();
                    } else {
                        b.hide();
                    }

                    blockIndex++;
                }
            }
        };

        TronGrid.prototype.dataChanged = function () {
            this.disposeData();
            this.measure();

            ////var rangeIndex = 0;
            ////var rowHeight = 0;
            ////for (var r = 0; r += this.options.rowsPerBlock; r < updatedCells.length) {
            ////    rowHeight = this.options.rowHeight(r);
            ////    for (var c = 0; c += this.options.viewportColumns; c < updatedCells[r].length) {
            ////        var range = this.ranges[rangeIndex];
            ////        if (!range) {
            ////            range = new CellBlock(r, c, this.options.columnWidth, this.options.template);
            ////            this.ranges[rangeIndex] = range;
            ////        }
            ////        range.bind(updatedCells);
            ////    }
            ////}
            ////// TODO: Use ko.compareArrays to be more efficient and bind only affected ranges
            ////this.cells = updatedCells;
            this.render();
            this.subscribeData();
        };

        TronGrid.prototype.subscribeData = function () {
            var d = this.options.dataProvider;
            ////if (ko.isObservable(d)) {
            ////    this.dataSubscription = (<KnockoutObservable<any>>d).subscribe(() => this.dataChanged());
            ////}
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
            this.scrollChanged();
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
