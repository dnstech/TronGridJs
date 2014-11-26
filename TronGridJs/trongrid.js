/// <reference path="types/knockout.d.ts" />
/// <reference path="types/jquery.d.ts" />
window['requestAnimFrame'] = (function () {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) {
        window.setTimeout(callback, 1000 / 60);
    };
})();

(function () {
    // prepare base perf object
    if (typeof window.performance === 'undefined') {
        window.performance = {};
    }

    if (!window.performance.now) {
        var nowOffset = Date.now();
        if (performance.timing && performance.timing.navigationStart) {
            nowOffset = performance.timing.navigationStart;
        }

        window.performance.now = function now() {
            return Date.now() - nowOffset;
        };
    }
})();

var TronGrid;
(function (_TronGrid) {
    _TronGrid.enqueue = !!window.setImmediate ? function (f) {
        window.setImmediate(f);
    } : function (f) {
        window.setTimeout(f, 1000 / 30);
    };

    function padLeft(n, w) {
        var n_ = Math.abs(n);
        var zeros = Math.max(0, w - Math.floor(n_).toString().length);
        var zeroString = Math.pow(10, zeros).toString().substr(1);
        if (n < 0) {
            zeroString = '-' + zeroString;
        }

        return zeroString + n;
    }

    function binarySearch(array, findValue, compareFunction, startIndex, length) {
        if (typeof startIndex === "undefined") { startIndex = 0; }
        if (typeof length === "undefined") { length = array.length; }
        var num1 = startIndex;
        var num2 = startIndex + length - 1;
        while (num1 <= num2) {
            var index1 = num1 + (num2 - num1 >> 1);
            var num3 = compareFunction(array[index1], findValue);
            if (num3 == 0) {
                return index1;
            }

            if (num3 < 0) {
                num1 = index1 + 1;
            } else {
                num2 = index1 - 1;
            }
        }

        return ~num1;
    }

    function insertSortedById(parent, newNode) {
        var id = newNode.id;
        var index = -1;
        for (var i = 0; i < parent.children.length; i++) {
            var nextId = parent.children[i].id;
            if (!!nextId && id < nextId) {
                index = i;
                break;
            }
        }

        if (index !== -1) {
            parent.insertBefore(newNode, parent.children[index]);
        } else {
            parent.appendChild(newNode);
        }
    }

    var CellRange = (function () {
        function CellRange(firstBlock, lastBlock) {
            this.firstColumn = 0;
            this.firstBlockColumn = 0;
            this.lastColumn = 0;
            this.lastBlockColumn = 0;
            this.firstRow = 0;
            this.firstBlockRow = 0;
            this.lastRow = 0;
            this.lastBlockRow = 0;
            if (firstBlock) {
                this.setTopLeft(firstBlock);
                if (!lastBlock) {
                    this.setBottomRight(firstBlock);
                }
            }

            if (lastBlock) {
                this.setBottomRight(lastBlock);
            }
        }
        CellRange.prototype.cellCount = function () {
            return (this.lastRow - this.firstRow) * (this.lastColumn - this.firstColumn);
        };

        CellRange.prototype.setTopLeft = function (topLeftBlock) {
            this.firstColumn = topLeftBlock.cellRange.firstColumn;
            this.firstBlockColumn = topLeftBlock.cellRange.firstBlockColumn;
            this.firstRow = topLeftBlock.cellRange.firstRow;
            this.firstBlockRow = topLeftBlock.cellRange.firstBlockRow;
        };

        CellRange.prototype.setBottomRight = function (bottomRight) {
            this.lastColumn = bottomRight.cellRange.lastColumn;
            this.lastBlockColumn = bottomRight.cellRange.lastBlockColumn;
            this.lastRow = bottomRight.cellRange.lastRow;
            this.lastBlockRow = bottomRight.cellRange.lastBlockRow;
        };

        CellRange.prototype.isEmpty = function () {
            return this.firstColumn === 0 && this.lastColumn === 0 && this.firstRow === 0 && this.lastRow === 0 && this.firstBlockColumn === 0 && this.firstBlockRow === 0 && this.lastBlockColumn === 0 && this.lastBlockRow === 0;
        };

        CellRange.prototype.equals = function (cellRange) {
            if (!cellRange) {
                return false;
            }

            return this.firstColumn === cellRange.firstColumn && this.lastColumn === cellRange.lastColumn && this.firstRow === cellRange.firstRow && this.lastRow === cellRange.lastRow && this.firstBlockColumn === cellRange.firstBlockColumn && this.firstBlockRow === cellRange.firstBlockRow && this.lastBlockColumn === cellRange.lastBlockColumn && this.lastBlockRow === cellRange.lastBlockRow;
        };
        return CellRange;
    })();

    /** A set of cells rendered as a single chunk */
    var CellBlock = (function () {
        function CellBlock(index, cellRange, parent, grid) {
            this.index = index;
            this.cellRange = cellRange;
            this.parent = parent;
            this.grid = grid;
            this.markedForRemoval = false;
            this.isRendered = false;
            this.isVisible = false;
            this.isMeasured = false;
            this.currentLeft = 0;
            this.currentTop = 0;
            ////public firstRow: number,
            ////public lastRow: number,
            ////public firstColumn: number,
            ////public lastColumn: number,
            ////public blockRow: number,
            ////public blockColumn: number,
            this.blockId = 'tgb_' + padLeft(this.index, 10);
        }
        CellBlock.prototype.show = function () {
            this.markedForRemoval = false;
            if (!this.isRendered) {
                this.render();
            }

            if (this.isVisible) {
                return;
            }

            this.isVisible = true;
            this.parent.appendChild(this.block);
            ////insertSortedById(this.parent, this.block);
        };

        CellBlock.prototype.hide = function () {
            this.markedForRemoval = false;
            if (!this.isVisible) {
                return;
            }

            this.isVisible = false;
            this.parent.removeChild(this.block);
        };

        CellBlock.prototype.invalidate = function (measurementsChanged) {
            if (typeof measurementsChanged === "undefined") { measurementsChanged = false; }
            if (measurementsChanged) {
                this.isMeasured = false;
            }

            this.isRendered = false;
        };

        CellBlock.prototype.createBlockElement = function () {
            var b;
            if (this.grid.presenter.createBlock) {
                b = this.grid.presenter.createBlock(this.cellRange);
            } else {
                b = document.createElement('div');
            }

            b.setAttribute('id', this.blockId);
            b.className += ' block';
            this.bounds.apply(b);
            return b;
        };

        CellBlock.prototype.createCellElement = function (r, c) {
            var cell;
            if (!!this.grid.presenter.createCell) {
                var size = {
                    width: this.grid.columnWidths[c],
                    height: this.grid.rowHeights[r]
                };

                cell = this.grid.presenter.createCell(r, c, size);
            } else {
                cell = document.createElement('div');
            }

            cell.setAttribute('id', 'tgc_' + r + '_' + c);
            cell.className += ' cell';
            return cell;
        };

        /** Binds to just the relevant portion of the full two-dimensional cells array */
        CellBlock.prototype.render = function () {
            if (!this.block) {
                this.block = this.createBlockElement();
            }

            this.renderBlock(this.block);

            this.isMeasured = true;
            this.isRendered = true;
        };

        CellBlock.prototype.renderBlock = function (block) {
            if (block.childElementCount !== this.cellRange.cellCount()) {
                var fragment = document.createDocumentFragment();
                for (var r = this.cellRange.firstRow; r < this.cellRange.lastRow; r++) {
                    for (var c = this.cellRange.firstColumn; c < this.cellRange.lastColumn; c++) {
                        var cell = this.createCellElement(r, c);
                        this.renderCell(r, c, cell, false);
                        fragment.appendChild(cell);
                    }
                }

                this.block.appendChild(fragment);
            } else {
                // Recycle cells
                var cellIndex = 0;
                for (var r = this.cellRange.firstRow; r < this.cellRange.lastRow; r++) {
                    for (var c = this.cellRange.firstColumn; c < this.cellRange.lastColumn; c++) {
                        var cell = block.children[cellIndex];
                        this.renderCell(r, c, cell, true);
                        cellIndex++;
                    }
                }
            }
        };

        CellBlock.prototype.renderCell = function (r, c, cell, recycled) {
            var size = {
                width: this.grid.columnWidths[c],
                height: this.grid.rowHeights[r]
            };

            var cellData = this.grid.provider.cellData(r, c, this.grid.visibleCellRange);
            if (!this.isMeasured) {
                if (c === this.cellRange.firstColumn) {
                    this.currentLeft = 0;
                }

                if (r === this.cellRange.firstRow) {
                    this.currentTop = 0;
                }

                cell.style.left = this.currentLeft + 'px';
                cell.style.top = this.currentTop + 'px';

                // HACK: Fudged width by 0.5 because of rendering bug in Chrome to do with either anti-aliasing or measurement rounding.
                cell.style.width = (size.width + 0.5) + 'px';
                cell.style.height = size.height + 'px';

                if (c === this.cellRange.lastColumn - 1) {
                    this.currentLeft = 0;
                    this.currentTop += size.height;
                } else {
                    this.currentLeft += size.width;
                }
            }

            this.grid.presenter.renderCell(cell, cellData, r, c, size, recycled);
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
        Rectangle.prototype.prefix = function (style, prop, value) {
            var prefs = ['webkit', 'Moz', 'o', 'ms'];
            for (var pref in prefs) {
                style[prefs[pref] + prop] = value;
            }
        };

        Rectangle.prototype.compareX = function (x) {
            if (this.left > x)
                return -1;
            if (this.right < x)
                return 1;

            return 0;
        };

        Rectangle.prototype.compareY = function (y) {
            if (this.top > y)
                return -1;
            if (this.bottom < y)
                return 1;

            return 0;
        };

        /** Compares this rectangle to the point specified */
        Rectangle.prototype.compareToPoint = function (x, y) {
            if (this.left > x)
                return -1;
            if (this.right < x)
                return 1;
            if (this.top > y)
                return -1;
            if (this.bottom < y)
                return 1;

            return 0;
        };

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

        /** Returns a new Rectangle expanded to the specified size,
        centered on this rectangle if possible (will not give negative bounds) */
        Rectangle.prototype.resize = function (size) {
            var halfWidth = (this.width / 2) | 0;
            var halfHeight = (this.height / 2) | 0;
            var halfNewWidth = (size.width / 2) | 0;
            var halfNewHeight = (size.height / 2) | 0;
            var l = Math.max(0, (this.left - halfNewWidth) + halfWidth);
            var t = Math.max(0, (this.top - halfNewHeight) + halfHeight);
            return new Rectangle(l, t, size.width, size.height);
        };

        Rectangle.prototype.apply = function (element) {
            element.style.top = this.top + 'px';
            element.style.left = this.left + 'px';
            element.style.width = this.width + 'px';
            element.style.height = this.height + 'px';
        };

        Rectangle.prototype.apply3dTranslate = function (element) {
            this.prefix(element.style, 'Transform', 'translate3d(' + this.left + 'px,' + this.top + 'px, 0)');
            element.style.width = this.width + 'px';
            element.style.height = this.height + 'px';
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
    _TronGrid.Rectangle = Rectangle;

    var TextPresenter = (function () {
        function TextPresenter() {
        }
        TextPresenter.prototype.renderCell = function (cell, data) {
            cell.textContent = data;
        };
        return TextPresenter;
    })();
    _TronGrid.TextPresenter = TextPresenter;

    /** The main grid logic, which is attached to the Scroller via the binding handler */
    var TronGrid = (function () {
        function TronGrid(scroller) {
            this.scroller = scroller;
            this.defaultOptions = {
                dataPresenter: new TextPresenter(),
                initialColumn: 0,
                initialRow: 0
            };
            this.defaultDataProviderOptions = {
                dataPresenter: new TextPresenter(),
                columnsPerBlock: 10,
                rowsPerBlock: 10
            };
            this.renderQueued = 0;
            this.measureQueued = false;
            this.options = this.defaultOptions;
            this.blockLefts = [];
            this.blockTops = [];
            this.blockWidths = [];
            this.blockHeights = [];
            this.columnWidths = [];
            this.rowHeights = [];
            this.totalHeight = 0;
            this.totalWidth = 0;
            this.blockContainerWidth = 0;
            this.blockContainerHeight = 0;
            this.blockContainerLeft = 0;
            this.blockContainerTop = 0;
            this.scrollerSize = { width: 0, height: 0 };
            this.dataCellRange = {
                firstColumn: 0,
                firstBlockColumn: 0,
                lastColumn: 0,
                lastBlockColumn: 0,
                firstRow: 0,
                firstBlockRow: 0,
                lastRow: 0,
                lastBlockRow: 0
            };
            this.visibleCellRange = {
                firstColumn: 0,
                firstBlockColumn: 0,
                lastColumn: 0,
                lastBlockColumn: 0,
                firstRow: 0,
                firstBlockRow: 0,
                lastRow: 0,
                lastBlockRow: 0
            };
            this.blocks = [];
            this.registerEventHandlers();
        }
        TronGrid.prototype.update = function (o) {
            var _this = this;
            this.options = $.extend({}, this.defaultOptions, o);
            this.provider = $.extend({}, this.defaultDataProviderOptions, this.options.dataProvider);
            this.presenter = this.options.dataPresenter;
            this.subscribeData();

            ////this.content = document.createElement('div');
            ////this.content.className = 'tron-grid-viewport';
            ////this.scroller.appendChild(this.content);
            if (!this.blockContainer) {
                this.scroller.className += ' tron-grid';
                this.blockContainer = document.createElement('div');
                this.blockContainer.className = 'tron-grid-container';
                this.scroller.appendChild(this.blockContainer);
                this.content = this.blockContainer;

                if (!!this.options.behaviors) {
                    for (var b = 0; b < this.options.behaviors.length; b++) {
                        this.options.behaviors[b].attach(this);
                    }
                }
            }

            _TronGrid.enqueue(function () {
                _this.updateScrollBounds();
                _this.dataChanged();
            });
        };

        // AC: Experiment using requestAnimationFrame to ensure scroll changes are only raised once per frame.
        ////ticking = false;
        ////updateScrollAndRender() {
        ////    this.ticking = false;
        ////    this.updateScrollBounds();
        ////    this.enqueueRender();
        ////}
        ////scrollChanged() {
        ////    if (!this.ticking) {
        ////        this.ticking = true;
        ////        (<any>window).requestAnimFrame(this.updateScrollAndRender.bind(this));
        ////    }
        ////}
        TronGrid.prototype.scrollChanged = function () {
            this.updateScrollBounds();
            if (!!this.options.behaviors) {
                for (var b = 0; b < this.options.behaviors.length; b++) {
                    if (this.options.behaviors[b].scrollChanged) {
                        this.options.behaviors[b].scrollChanged(this.scrollBounds);
                    }
                }
            }

            this.enqueueRender(2);
        };

        TronGrid.prototype.enqueueMeasureAndRender = function () {
            var _this = this;
            if (this.measureQueued) {
                return;
            }

            this.measureQueued = true;
            this.renderQueued = 1;
            window.requestAnimFrame(function () {
                _this.measureQueued = false;
                _this.renderQueued = 0;
                _this.measure();
                _this.render();
            });
        };

        TronGrid.prototype.enqueueRender = function (everyFrames) {
            var _this = this;
            if (typeof everyFrames === "undefined") { everyFrames = 1; }
            if (this.renderQueued) {
                return;
            }

            this.renderQueued = everyFrames;
            var self;
            self = function () {
                _this.renderQueued--;
                if (_this.renderQueued <= 0) {
                    _this.renderQueued = 0;
                    _this.render();
                } else {
                    window.requestAnimFrame(self);
                }
            };

            window.requestAnimFrame(self);
        };

        TronGrid.prototype.updateScrollBounds = function () {
            if (this.scrollerSize.width === 0 || this.scrollerSize.height === 0) {
                this.scrollerSize = {
                    width: this.scroller.clientWidth,
                    height: this.scroller.clientHeight
                };
            }

            this.scrollBounds = new Rectangle(this.scroller.scrollLeft, this.scroller.scrollTop, this.scrollerSize.width, this.scrollerSize.height);
        };

        TronGrid.prototype.measureColumns = function () {
            var blockColumn = 0;
            var blockLeft = 0;
            var blockWidth = 0;
            var previousTotalWidth = this.totalWidth;
            if (this.columnWidths.length !== this.provider.columnCount) {
                this.totalWidth = 0;
                var c = 0;
                var currentColumnInBlock = 0;
                for (c = 0; c < this.provider.columnCount; c++) {
                    var w = this.provider.columnWidth(c);
                    this.columnWidths[c] = w;
                    this.totalWidth += w;
                    blockWidth += w;

                    currentColumnInBlock++;
                    if (currentColumnInBlock === this.provider.columnsPerBlock) {
                        this.blockLefts[blockColumn] = blockLeft;
                        this.blockWidths[blockColumn] = blockWidth;

                        blockLeft += blockWidth;
                        blockWidth = 0;
                        blockColumn++;
                        currentColumnInBlock = 0;
                    }
                }

                this.blockLefts[blockColumn] = blockLeft;
                this.blockWidths[blockColumn] = blockWidth;
            } else if (this.columnWidths.length === 0) {
                this.totalWidth = 0;
            }

            if (previousTotalWidth != this.totalWidth) {
                this.content.style.width = this.totalWidth + 'px';
            }
        };

        TronGrid.prototype.measureRows = function () {
            var blockRow = 0;
            var blockTop = 0;
            var blockHeight = 0;
            var previousTotalHeight = this.totalHeight;
            if (this.rowHeights.length !== this.provider.rowCount) {
                this.totalHeight = 0;
                var r = 0;
                var currentRowInBlock = 0;
                for (r = 0; r < this.provider.rowCount; r++) {
                    var h = this.options.dataProvider.rowHeight(r);
                    this.rowHeights[r] = h;
                    this.totalHeight += h;
                    blockHeight += h;

                    currentRowInBlock++;
                    if (currentRowInBlock === this.provider.rowsPerBlock) {
                        this.blockTops[blockRow] = blockTop;
                        this.blockHeights[blockRow] = blockHeight;

                        blockTop += blockHeight;
                        blockHeight = 0;
                        blockRow++;
                        currentRowInBlock = 0;
                    }
                }

                this.blockTops[blockRow] = blockTop;
                this.blockHeights[blockRow] = blockHeight;
            } else if (this.provider.rowCount === 0) {
                this.totalHeight = 0;
            }

            if (this.totalHeight != previousTotalHeight) {
                this.content.style.height = this.totalHeight + 'px';
            }
        };

        TronGrid.prototype.measure = function () {
            this.measureColumns();
            this.measureRows();

            var blockIndex = 0;
            for (var br = 0; br < this.blockHeights.length; br++) {
                for (var bc = 0; bc < this.blockWidths.length; bc++) {
                    var b = this.blocks[blockIndex];
                    if (!b) {
                        var cellRange = new CellRange();
                        cellRange.firstRow = br * this.provider.rowsPerBlock;
                        cellRange.lastRow = (br * this.provider.rowsPerBlock) + this.provider.rowsPerBlock;
                        cellRange.firstColumn = (bc * this.provider.columnsPerBlock);
                        cellRange.lastColumn = (bc * this.provider.columnsPerBlock) + this.provider.columnsPerBlock;
                        cellRange.firstBlockRow = br;
                        cellRange.lastBlockRow = br;
                        cellRange.firstBlockColumn = bc;
                        cellRange.lastBlockColumn = bc;
                        b = new CellBlock(blockIndex, cellRange, this.blockContainer, this);

                        this.blocks[blockIndex] = b;
                    }

                    b.bounds = new Rectangle(this.blockLefts[bc], this.blockTops[br], this.blockWidths[bc], this.blockHeights[br]);

                    ////if (!b.bounds.isValid()) {
                    ////    throw 'Invalid bounds ' + b.bounds.toString() + ', at index ' + blockIndex + '[' + br + ',' + bc + ']';
                    ////}
                    b.invalidate(true);
                    blockIndex++;
                }
            }
        };

        TronGrid.prototype.getTopMostVisibleBlockIndex = function (bounds) {
            var topBlockIndex = binarySearch(this.blockTops, bounds.top, function (a, b) {
                if (a > b) {
                    return 1;
                }

                if (a < b) {
                    return -1;
                }

                return 0;
            });

            if (topBlockIndex < 0) {
                // Bitwise complement would give place to insert, go one up from that to give the first visible block
                topBlockIndex = Math.max(0, ~topBlockIndex - 1);
            }

            return topBlockIndex;
        };

        TronGrid.prototype.getVisibleCellRange = function (bounds) {
            if (this.blocks.length === 0) {
                return new CellRange();
            }

            // TODO: Make this accurate to the cell, for now just visible block first column
            var firstBlockRow = this.getTopMostVisibleBlockIndex(bounds);
            var firstBlockColumn = this.getLeftMostVisibleBlockIndex(bounds);
            var topLeftBlockIndex = this.getBlockIndexForBlockRowAndColumn(firstBlockRow, firstBlockColumn);

            var rightPosition = this.blockLefts[firstBlockColumn];
            var lastBlockColumn = firstBlockColumn;
            for (var c = firstBlockColumn; c < this.blockLefts.length; c++) {
                rightPosition += this.blockWidths[c];
                if (bounds.compareToPoint(rightPosition, bounds.top) !== 0) {
                    lastBlockColumn = c;
                    break;
                }
            }

            var topPosition = this.blockTops[firstBlockRow];
            var lastBlockRow = firstBlockRow;
            for (var r = firstBlockRow; r < this.blockTops.length; r++) {
                topPosition += this.blockTops[r];
                if (bounds.compareToPoint(bounds.left, topPosition) !== 0) {
                    lastBlockRow = r;
                    break;
                }
            }

            var bottomRightBlockIndex = this.getBlockIndexForBlockRowAndColumn(lastBlockRow, lastBlockColumn);
            return new CellRange(this.blocks[topLeftBlockIndex], this.blocks[bottomRightBlockIndex]);
        };

        TronGrid.prototype.getLeftMostVisibleBlockIndex = function (bounds) {
            var leftBlockIndex = binarySearch(this.blockLefts, bounds.left, function (a, b) {
                if (a > b) {
                    return 1;
                }

                if (a < b) {
                    return -1;
                }

                return 0;
            });

            if (leftBlockIndex < 0) {
                // Bitwise complement would give place to insert, go one left from that to give the first visible block
                leftBlockIndex = Math.max(0, ~leftBlockIndex - 1);
            }

            return leftBlockIndex;
        };

        TronGrid.prototype.getBlockIndexForBlockRowAndColumn = function (blockRow, blockColumn) {
            return (blockRow * this.blockWidths.length) + blockColumn;
        };

        TronGrid.prototype.render = function () {
            if (!this.scrollBounds.isValid()) {
                return;
            }

            var start = performance.now();
            var time = 0;
            var lookaheadBounds = this.scrollBounds.resize({
                width: this.scrollBounds.width * 2,
                height: this.scrollBounds.height * 2
            });

            var leftBlockIndex = this.getLeftMostVisibleBlockIndex(lookaheadBounds);
            var topBlockIndex = this.getTopMostVisibleBlockIndex(lookaheadBounds);

            var visibleBlockWidth = 0;
            var visibleBlockHeight = 0;
            var isTopLeftCell = true;
            var renderedRow = false;
            var hasRendered = false;

            for (var i = 0; i < this.blocks.length; i++) {
                if (this.blocks[i].isVisible) {
                    this.blocks[i].markedForRemoval = true;
                }
            }

            var firstBlock = this.blocks[(topBlockIndex * this.blockWidths.length) + leftBlockIndex];
            var lastBlock = firstBlock;
            for (var br = topBlockIndex; br < this.blockHeights.length; br++) {
                renderedRow = false;
                var width = 0;
                for (var bc = leftBlockIndex; bc < this.blockWidths.length; bc++) {
                    var blockIndex = (br * this.blockWidths.length) + bc;
                    var block = this.blocks[blockIndex];
                    var visible = this.renderBlock(block, lookaheadBounds);
                    if (visible) {
                        lastBlock = this.blocks[blockIndex];
                    }

                    renderedRow = renderedRow || visible;
                    if (renderedRow && isTopLeftCell) {
                        if (this.blockContainerLeft !== block.bounds.left) {
                            this.blockContainerLeft = block.bounds.left;
                            //this.content.style.paddingLeft = block.bounds.left + 'px';
                        }

                        if (this.blockContainerTop !== block.bounds.top) {
                            this.blockContainerTop = block.bounds.top;
                            //this.content.style.paddingTop = block.bounds.top + 'px';
                        }

                        isTopLeftCell = false;
                    }

                    if (visible) {
                        width += this.blocks[blockIndex].bounds.width;
                    }

                    time = performance.now() - start;
                    if (time > 8) {
                        // We're out of time, bail and enqueue another pass
                        this.enqueueRender();
                        return;
                    }
                }

                if (renderedRow) {
                    hasRendered = true;
                    visibleBlockWidth = width;
                    visibleBlockHeight += this.blocks[blockIndex].bounds.height;
                } else {
                    if (hasRendered) {
                        break;
                    }
                }
            }

            for (var i = 0; i < this.blocks.length; i++) {
                if (this.blocks[i].markedForRemoval) {
                    this.blocks[i].hide();

                    time = performance.now() - start;
                    if (time > 8) {
                        // We're out of time, bail and enqueue another pass
                        this.enqueueRender();
                        return;
                    }
                }
            }

            if (!!this.provider.dataRangeChanged) {
                var newDataRange = new CellRange(firstBlock, lastBlock);
                if (!newDataRange.isEmpty() && !newDataRange.equals(this.dataCellRange)) {
                    this.dataCellRange = newDataRange;
                    this.provider.dataRangeChanged(newDataRange);
                }
            }

            if (!!this.provider.visibleRangeChanged) {
                var newVisibleRange = this.getVisibleCellRange(this.scrollBounds);
                if (!newVisibleRange.equals(this.visibleCellRange)) {
                    this.visibleCellRange = newVisibleRange;
                    this.provider.visibleRangeChanged(newVisibleRange);
                }
            }

            // HACK: Invalid scroll size again, as we've rendered content
            if (this.scrollBounds.height === 0) {
                this.scrollChanged();
            }
            ////if (this.blockContainerWidth !== visibleBlockWidth) {
            ////    this.blockContainerWidth = visibleBlockWidth;
            ////    this.blockContainer.style.width = visibleBlockWidth + 'px';
            ////}
            ////if (this.blockContainerHeight !== visibleBlockHeight) {
            ////    this.blockContainerHeight = visibleBlockHeight;
            ////    this.blockContainer.style.height = visibleBlockHeight + 'px';
            ////}
        };

        TronGrid.prototype.renderBlock = function (block, bounds) {
            if (block.bounds.intersects(bounds)) {
                block.show();
                return true;
            }

            block.hide();
            return false;
        };

        TronGrid.prototype.getBlockIndex = function (row, column) {
            var br = (((row * this.provider.columnCount) / this.provider.columnsPerBlock) | 0);
            var bc = (column / this.provider.columnsPerBlock) | 0;
            return br + bc;
        };

        TronGrid.prototype.clearMeasurements = function () {
            for (var i = 0; i < this.blocks.length; i++) {
                this.blocks[i].hide();
            }

            this.blocks = [];
            this.blockHeights = [];
            this.blockLefts = [];
            this.blockTops = [];
            this.blockWidths = [];
            this.columnWidths = [];
            this.rowHeights = [];
        };

        /** Invalidates the rendered data, either wholesale or selectively by row, column or both,
        If cell sizes are affected by data then sizeChanged should be set to true */
        TronGrid.prototype.dataChanged = function (change) {
            var hasRow = !!change && typeof change.firstRow !== 'undefined';
            var hasColumn = !!change && typeof change.firstColumn !== 'undefined';
            var sizeChanged = (!!change && change.sizeChanged) || false;
            var cellCountChanged = sizeChanged && this.columnWidths.length !== this.provider.columnCount || this.rowHeights.length !== this.provider.rowCount;
            if (cellCountChanged) {
                this.clearMeasurements();
                this.enqueueMeasureAndRender();
                return;
            }

            if (!hasRow && hasColumn) {
                // Invalidate all rows for the column range
                change.firstRow = 0;
                change.lastRow = typeof change.lastRow !== 'undefined' ? change.lastRow : this.rowHeights.length;
            }

            if (hasRow && !hasColumn) {
                // Invalidate all columns for the row range;
                change.firstColumn = 0;
                change.lastColumn = typeof change.lastColumn !== 'undefined' ? change.lastColumn : this.columnWidths.length;
            }

            // Row set, but column undefined invalidates an entire row,
            // Column set, but row undefined invalidates an entire column.
            // Both row and column set invalidates a cell.
            if (hasRow || hasColumn) {
                change.firstRow = Math.max(0, change.firstRow);
                change.lastRow = Math.min(change.lastRow, this.rowHeights.length - 1);
                change.firstColumn = Math.max(0, change.firstColumn);
                change.lastColumn = Math.min(change.lastColumn, this.columnWidths.length - 1);
                for (var r = change.firstRow; r <= change.lastRow; r++) {
                    for (var c = change.firstColumn; c <= change.lastColumn; c++) {
                        var b = this.blocks[this.getBlockIndex(r, c)];
                        if (b) {
                            b.invalidate(sizeChanged);
                        }
                    }
                }
            } else {
                for (var i = 0; i < this.blocks.length; i++) {
                    this.blocks[i].invalidate(sizeChanged);
                }
            }

            if (sizeChanged || this.blockWidths.length === 0) {
                this.enqueueMeasureAndRender();
            } else {
                this.enqueueRender();
            }
        };

        TronGrid.prototype.sumRange = function (values, startIndex, lastIndex) {
            var v = 0;
            for (var i = startIndex; i < Math.min(lastIndex, values.length); i++) {
                v += values[i];
            }

            return v;
        };

        TronGrid.prototype.scrollTo = function (scroll) {
            var leftOffset = this.sumRange(this.columnWidths, 0, scroll.firstColumn);
            var topOffset = this.sumRange(this.rowHeights, 0, scroll.firstRow);
            var width = this.sumRange(this.columnWidths, scroll.firstColumn, scroll.lastColumn + 1);
            var height = this.sumRange(this.rowHeights, scroll.firstRow, scroll.lastRow + 1);
            var rect = new Rectangle(leftOffset, topOffset, width, height);

            var alignRightEdge = rect.right < this.scroller.scrollLeft + this.scrollerSize.width;
            var alignLeftEdge = rect.left > this.scroller.scrollLeft;
            var alignBottomEdge = rect.bottom < this.scroller.scrollTop + this.scrollerSize.height;
            var alignTopEdge = rect.top > this.scroller.scrollTop;
            if (!alignLeftEdge && !alignRightEdge && !alignTopEdge && !alignBottomEdge) {
                return;
            }

            var scrollX = alignLeftEdge ? leftOffset : (alignRightEdge ? Math.max(0, leftOffset + width - this.scrollerSize.width) : this.scroller.scrollLeft);
            var scrollY = alignTopEdge ? topOffset : (alignBottomEdge ? Math.max(0, topOffset + height - this.scrollerSize.height) : this.scroller.scrollTop);
            if (!!scroll.duration) {
                $(this.scroller).animate({
                    scrollLeft: scrollX,
                    scrollTop: scrollY
                }, scroll.duration);
            } else {
                this.scroller.scrollLeft = scrollX;
                this.scroller.scrollTop = scrollY;
            }
        };

        TronGrid.prototype.subscribeData = function () {
            var _this = this;
            this.disposeData();
            this.dataSubscription = this.provider.dataChanged.subscribe(function (d) {
                return _this.dataChanged(d);
            });
            if (!!this.provider.scrollIntoView) {
                this.scrollSubscription = this.provider.scrollIntoView.subscribe(function (request) {
                    return _this.scrollTo(request);
                });
            }
        };

        TronGrid.prototype.disposeData = function () {
            if (!!this.dataSubscription) {
                this.dataSubscription.dispose();
                this.dataSubscription = null;
            }

            if (!!this.scrollSubscription) {
                this.scrollSubscription.dispose();
                this.scrollSubscription = null;
            }
        };

        TronGrid.prototype.registerEventHandlers = function () {
            var _this = this;
            $(window).resize(function () {
                return _this.sizeChanged();
            });

            ////ko.utils.domNodeDisposal.addDisposeCallback(this.scroller, () => $(this.scroller).off('resize'));
            ////ko.utils.registerEventHandler(this.scroller, 'resize', this.sizeChanged.bind(this));
            ko.utils.registerEventHandler(this.scroller, 'scroll', this.scrollChanged.bind(this));
        };

        TronGrid.prototype.sizeChanged = function () {
            this.scrollerSize = {
                width: this.scroller.clientWidth,
                height: this.scroller.clientHeight
            };

            if (!!this.options.behaviors) {
                for (var b = 0; b < this.options.behaviors.length; b++) {
                    if (this.options.behaviors[b].sizeChanged) {
                        this.options.behaviors[b].sizeChanged(this.scrollerSize);
                    }
                }
            }

            this.scrollChanged();
        };
        return TronGrid;
    })();
    _TronGrid.TronGrid = TronGrid;
})(TronGrid || (TronGrid = {}));
//# sourceMappingURL=trongrid.js.map
