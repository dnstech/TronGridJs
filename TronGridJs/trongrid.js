/// <reference path="types/knockout.d.ts" />
/// <reference path="types/jquery.d.ts" />
// Binary search from https://gist.github.com/uberbrady/10605041

var TronGrid;
(function (_TronGrid) {
    var CellBlock = (function () {
        function CellBlock(firstRow, lastRow, firstColumn, lastColumn, parent, grid) {
            this.firstRow = firstRow;
            this.lastRow = lastRow;
            this.firstColumn = firstColumn;
            this.lastColumn = lastColumn;
            this.parent = parent;
            this.grid = grid;
            this.isRendered = false;
            this.isVisible = false;
        }
        CellBlock.prototype.show = function () {
            if (!this.isRendered) {
                this.render();
            }

            if (this.isVisible) {
                return;
            }

            this.isVisible = true;
            this.parent.appendChild(this.block);
        };

        CellBlock.prototype.hide = function () {
            if (!this.isVisible) {
                return;
            }

            this.isVisible = false;
            this.block.style.display = 'none';
        };

        /** Binds to just the relevant portion of the full two-dimensional cells array */
        CellBlock.prototype.render = function () {
            if (!this.block) {
                this.block = document.createElement('div');
                this.block.setAttribute('id', 'tgb_' + this.firstRow + '_' + this.firstColumn);
                this.block.style.width = this.bounds.width + 'px';
                this.block.style.height = this.bounds.height + 'px';
            } else {
                this.block.innerHTML = '';
            }

            for (var r = this.firstRow; r < this.lastRow; r++) {
                for (var c = this.firstColumn; c < this.lastColumn; c++) {
                    var cell = document.createElement('div');
                    cell.setAttribute('id', 'tgc_' + r + '_' + c);
                    cell.setAttribute('class', 'cell');
                    cell.style.width = this.grid.columnWidths[c] + 'px';
                    cell.style.height = this.grid.rowHeights[r] + 'px';
                    var cellData = this.grid.provider.cellData(r, c);
                    this.grid.presenter.renderCell(cell, cellData, r, c);
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
            // DEBUG: Check for nans
            if (isNaN(this.left) || isNaN(this.right) || isNaN(this.top) || isNaN(this.bottom)) {
                return false;
            }

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
                dataPresenter: new TextPresenter(),
                rowsPerBlock: 10,
                columnsPerBlock: 10
            };
            this.options = this.defaultOptions;
            this.blockLefts = [];
            this.blockTops = [];
            this.blockWidths = [];
            this.blockHeights = [];
            this.columnWidths = [];
            this.rowHeights = [];
            this.totalHeight = 0;
            this.totalWidth = 0;
            this.blocks = [];
            this.registerEventHandlers();
        }
        TronGrid.prototype.update = function (o) {
            this.options = o;
            $.extend(this.options, this.defaultOptions);
            this.provider = this.options.dataProvider;
            this.presenter = this.options.dataPresenter;

            this.content = document.createElement('div');
            this.scroller.appendChild(this.content);
            this.updateScrollBounds();
            this.dataChanged();
        };

        TronGrid.prototype.scrollChanged = function () {
            this.updateScrollBounds();
            this.render();
        };

        TronGrid.prototype.updateScrollBounds = function () {
            this.scrollBounds = new Rectangle(this.scroller.scrollLeft, this.scroller.scrollTop, this.scroller.offsetWidth, this.scroller.offsetHeight);
        };

        TronGrid.prototype.measureColumns = function () {
            var blockColumn = 0;
            var blockLeft = 0;
            var blockWidth = 0;
            this.totalWidth = 0;
            var c = 0;
            for (c = 0; c < this.provider.columnCount; c++) {
                var w = this.provider.columnWidth(c);
                this.columnWidths[c] = w;
                this.totalWidth += w;
                blockWidth += w;

                if ((c + 1) % this.options.columnsPerBlock === 0) {
                    this.blockLefts[blockColumn] = blockLeft;
                    this.blockWidths[blockColumn] = blockWidth;

                    blockLeft += blockWidth;
                    blockWidth = 0;
                    blockColumn++;
                }
            }

            if ((c + 1) % this.options.columnsPerBlock === 0) {
                this.blockLefts[blockColumn] = blockLeft;
                this.blockWidths[blockColumn] = blockWidth;
            }
        };

        TronGrid.prototype.measureRows = function () {
            var blockRow = 0;
            var blockTop = 0;
            var blockHeight = 0;
            this.totalHeight = 0;
            var r = 0;
            for (r = 0; r < this.provider.rowCount; r++) {
                var h = this.options.dataProvider.rowHeight(r);
                this.rowHeights[r] = h;
                this.totalHeight += h;
                blockHeight += h;

                if ((r + 1) % this.options.rowsPerBlock === 0) {
                    this.blockTops[blockRow] = blockTop;
                    this.blockHeights[blockRow] = blockHeight;

                    blockTop += blockHeight;
                    blockHeight = 0;
                    blockRow++;
                }
            }

            if ((r + 1) % this.options.rowsPerBlock === 0) {
                this.blockTops[blockRow] = blockTop;
                this.blockHeights[blockRow] = blockHeight;
            }
        };

        TronGrid.prototype.measure = function () {
            if (this.columnWidths.length !== this.provider.columnCount) {
                this.measureColumns();
            }

            if (this.rowHeights.length !== this.provider.rowCount) {
                this.measureRows();
            }

            this.content.style.width = this.totalWidth + 'px';
            this.content.style.height = this.totalHeight + 'px';
        };

        TronGrid.prototype.render = function () {
            var rangeIndex = this.scrollBounds.left;
            var isTopLeftCell = true;
            var renderedRow = false;
            for (var r = 0; r < this.provider.rowCount; r += this.options.rowsPerBlock) {
                renderedRow = false;
                for (var c = 0; c < this.provider.columnCount; c += this.options.columnsPerBlock) {
                    var blockIndex = (r * this.provider.columnCount) + c;
                    var b = this.blocks[blockIndex];
                    if (!b) {
                        b = new CellBlock(r, r + this.options.rowsPerBlock, c, c + this.options.columnsPerBlock, this.content, this);

                        // AC: This performs a Divide, Floor, Multiply to give the Block Column Index and Block Row Index;
                        var bc = (c / this.options.columnsPerBlock | 0) * this.options.columnsPerBlock;
                        var br = (r / this.options.rowsPerBlock | 0) * this.options.rowsPerBlock;
                        b.bounds = new Rectangle(this.blockLefts[bc], this.blockTops[br], this.blockWidths[bc], this.blockHeights[br]);
                        this.blocks[blockIndex] = b;
                    }

                    if (b.bounds.intersects(this.scrollBounds)) {
                        renderedRow = true;
                        b.show();
                        if (isTopLeftCell) {
                            isTopLeftCell = false;
                        }
                    } else {
                        b.hide();

                        // AC: Assume that's it for this row, note there may be some issues if we jump entire sections where blocks don't get hidden correctly.
                        if (renderedRow) {
                            break;
                        }
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
            ko.utils.registerEventHandler(this.scroller, 'resize', this.sizeChanged.bind(this));
            ko.utils.registerEventHandler(this.scroller, 'scroll', this.scrollChanged.bind(this));
        };

        TronGrid.prototype.sizeChanged = function () {
            this.scrollChanged();
        };
        return TronGrid;
    })();
    _TronGrid.TronGrid = TronGrid;
})(TronGrid || (TronGrid = {}));

ko.bindingHandlers.tronGrid = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var grid = new TronGrid.TronGrid(element);
        ko.utils.domData.set(element, 'trongrid', grid);
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var o = ko.unwrap(valueAccessor());
        var grid = ko.utils.domData.get(element, 'trongrid');
        grid.update(o);
    }
};
//# sourceMappingURL=trongrid.js.map
