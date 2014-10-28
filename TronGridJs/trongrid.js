/// <reference path="types/knockout.d.ts" />
/// <reference path="types/jquery.d.ts" />
// Binary search from https://gist.github.com/uberbrady/10605041

var TronGrid;
(function (_TronGrid) {
    var CellBlock = (function () {
        function CellBlock(index, firstRow, lastRow, firstColumn, lastColumn, parent, grid) {
            this.index = index;
            this.firstRow = firstRow;
            this.lastRow = lastRow;
            this.firstColumn = firstColumn;
            this.lastColumn = lastColumn;
            this.parent = parent;
            this.grid = grid;
            this.isRendered = false;
            this.isVisible = false;
            this.nextBlockId = '';
            this.blockId = 'tgb_' + this.index;
            this.nextBlockId = 'tgb_' + (this.index + 1);
        }
        CellBlock.prototype.show = function () {
            if (!this.isRendered) {
                this.render();
            }

            if (this.isVisible) {
                return;
            }

            this.isVisible = true;
            this.block.style.display = 'inline-block';
            this.parent.insertBefore(this.block, document.getElementById(this.nextBlockId));
        };

        CellBlock.prototype.hide = function () {
            if (!this.isVisible) {
                return;
            }

            this.isVisible = false;
            this.block.style.display = 'none';
            this.parent.removeChild(this.block);
        };

        /** Binds to just the relevant portion of the full two-dimensional cells array */
        CellBlock.prototype.render = function () {
            if (!this.block) {
                this.block = document.createElement('div');
                this.block.setAttribute('id', this.blockId);
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
            if (!this.isValid()) {
                throw 'Cannot intersect this is invalid: [' + this.toString() + ']';
            }

            if (!other.isValid()) {
                throw 'Cannot intersect other is invalid: [' + other.toString() + ']';
            }

            return !(this.left > other.right || this.right < other.left || this.top > other.bottom || this.bottom < other.top);
        };

        Rectangle.prototype.isValid = function () {
            return !isNaN(this.left) && !isNaN(this.right) && !isNaN(this.top) && !isNaN(this.bottom);
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

        Rectangle.prototype.toString = function () {
            return this.left + ',' + this.top + ',' + this.width + 'x' + this.height;
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
            var _this = this;
            this.updateScrollBounds();
            window.setImmediate(function () {
                _this.render();
            });
        };

        TronGrid.prototype.updateScrollBounds = function () {
            this.scrollBounds = new Rectangle(this.scroller.scrollLeft, this.scroller.scrollTop, this.scroller.clientWidth, this.scroller.clientHeight);
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

            this.content.style.width = this.totalWidth + 'px';
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

            this.content.style.height = this.totalHeight + 'px';
        };

        TronGrid.prototype.measure = function () {
            if (this.columnWidths.length !== this.provider.columnCount) {
                this.measureColumns();
            }

            if (this.rowHeights.length !== this.provider.rowCount) {
                this.measureRows();
            }

            var blockIndex = 0;
            for (var br = 0; br < this.blockHeights.length; br++) {
                for (var bc = 0; bc < this.blockWidths.length; bc++) {
                    var b = this.blocks[blockIndex];
                    if (!b) {
                        b = new CellBlock(blockIndex, br * this.options.rowsPerBlock, (br * this.options.rowsPerBlock) + this.options.rowsPerBlock, (bc * this.options.columnsPerBlock), (bc * this.options.columnsPerBlock) + this.options.columnsPerBlock, this.content, this);

                        this.blocks[blockIndex] = b;
                    }

                    b.bounds = new Rectangle(this.blockLefts[bc], this.blockTops[br], this.blockWidths[bc], this.blockHeights[br]);
                    if (!b.bounds.isValid()) {
                        throw 'Invalid bounds ' + b.bounds.toString() + ', at index ' + blockIndex + '[' + br + ',' + bc + ']';
                    }
                    blockIndex++;
                }
            }
        };

        TronGrid.prototype.render = function () {
            if (!this.scrollBounds.isValid()) {
                return;
            }

            var isTopLeftCell = true;
            var renderedRow = false;
            var blockColumnCount = (this.provider.columnCount / this.options.columnsPerBlock) | 0;
            for (var br = 0; br < this.blockHeights.length; br++) {
                for (var bc = 0; bc < this.blockWidths.length; bc++) {
                    renderedRow = false;
                    var blockIndex = (br * this.blockWidths.length) + bc;
                    renderedRow = renderedRow || this.renderBlockAtIndex(blockIndex);
                    if (renderedRow && isTopLeftCell) {
                        this.content.style.paddingLeft = this.blocks[blockIndex].bounds.left + 'px';
                        this.content.style.paddingTop = this.blocks[blockIndex].bounds.top + 'px';
                        isTopLeftCell = false;
                    }
                }
            }
        };

        TronGrid.prototype.renderBlockAtIndex = function (index) {
            var b = this.blocks[index];
            if (b.bounds.intersects(this.scrollBounds)) {
                b.show();
                return true;
            }

            b.hide();
            return false;
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
