/// <reference path="types/knockout.d.ts" />
/// <reference path="types/jquery.d.ts" />

window['requestAnimFrame'] = (function () {
    return window.requestAnimationFrame ||
        (<any>window).webkitRequestAnimationFrame ||
        (<any>window).mozRequestAnimationFrame ||
        (<any>window).oRequestAnimationFrame ||
        (<any>window).msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();


(function () {
    // prepare base perf object
    if (typeof window.performance === 'undefined') {
        (<any>window).performance = {};
    }

    if (!window.performance.now) {
        var nowOffset = Date.now();
        if (performance.timing && performance.timing.navigationStart) {
            nowOffset = performance.timing.navigationStart
        }

        window.performance.now = function now() {
            return Date.now() - nowOffset;
        }
    }
})();

module TronGrid {
    export var enqueue: { (action: () => void): void; } = !!<any>window.setImmediate ? function (f) {
        window.setImmediate(f);
    } : function (f) {
            window.setTimeout(f, 1000 / 30);
        };

    export interface IObservable<T> {
        subscribe(observer: (change: T) => void): {
            dispose(): void;
        };
    }

    export interface ICellRange {
        firstColumn?: number;
        firstRow?: number;
        lastColumn?: number;
        lastRow?: number;
    }

    export interface IBlockRange {
        firstBlockColumn: number;
        firstBlockRow: number;
        lastBlockColumn: number;
        lastBlockRow: number;
    }

    export interface ICellAndBlockRange extends ICellRange, IBlockRange {
    }

    export interface IScrollRequest extends ICellRange {
        duration?: number;
    }

    export interface ISize {
        /** Width in Pixels */
        width: number;
        /** Height in Pixels */
        height: number;
    }

    export interface IDataChanged extends ICellRange {
        sizeChanged?: boolean;
    }

    export interface IDataProvider {
        /** Number of rows per CellBlock */
        rowsPerBlock?: number;

        /** Number of columns per CellBlock */
        columnsPerBlock?: number;

        /** The first column to have scrolled into view */
        initialColumn?: number;

        /** The first row to have scrolled into view */
        initialRow?: number;

        rowHeight: (index) => number;
        columnWidth: (index) => number;
        cellData: (row: number, column: number, visibleRange?: ICellAndBlockRange) => any;
        columnCount: number;
        rowCount: number;
        dataRangeChanged?: (cellDataRange: ICellAndBlockRange, blockDataRange?: ICellAndBlockRange) => void;
        visibleRangeChanged?: (visibleRange: ICellAndBlockRange) => void;
        dataChanged?: IObservable<IDataChanged>;
        scrollIntoView?: IObservable<IScrollRequest>;
    }

    export interface IDataPresenter {
        createBlock?: (blockCellRange?: ICellAndBlockRange) => HTMLElement;
        createCell?: (row?: number, column?: number, size?: ISize) => HTMLElement;
        renderCell: (cell: HTMLElement, data: any, row: number, column: number, size?: ISize, recycled?: boolean) => void;
    }

    export interface IGridBehavior {
        attach: (grid: TronGrid) => void;
        scrollChanged?: (bounds: Rectangle) => void;
        sizeChanged?: (size: ISize) => void;
    }

    export interface IOptions {
        dataProvider: IDataProvider;

        /** Implementation of a renderer that fill's in a cell's content, defaults to TextPresenter */
        dataPresenter?: IDataPresenter;

        behaviors?: IGridBehavior[];
    }

    function padLeft(n, w) {
        var n_ = Math.abs(n);
        var zeros = Math.max(0, w - Math.floor(n_).toString().length);
        var zeroString = Math.pow(10, zeros).toString().substr(1);
        if (n < 0) {
            zeroString = '-' + zeroString;
        }

        return zeroString + n;
    }

    function binarySearch<T, TValue>(array: T[], findValue: TValue, compareFunction: (a: T, b: TValue) => number, startIndex: number = 0, length: number = array.length) {
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

    function insertSortedById(parent: HTMLElement, newNode: HTMLElement) {
        var id = newNode.id;
        var index = -1;
        for (var i = 0; i < parent.children.length; i++) {
            var nextId = (<any>parent.children[i]).id;
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

    class CellRange implements ICellAndBlockRange {
        firstColumn = 0;
        firstBlockColumn = 0;
        lastColumn = 0;
        lastBlockColumn = 0;
        firstRow = 0;
        firstBlockRow = 0;
        lastRow = 0;
        lastBlockRow = 0;

        constructor(firstBlock?: CellBlock, lastBlock?: CellBlock) {
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

        cellCount() {
            return (this.lastRow - this.firstRow) * (this.lastColumn - this.firstColumn);
        }

        /** Calculates the absolute row and column for a given index relative to the cell range 
        (where the top left cell in the range is zero, and the bottom right cell in the range is the range's cell count - 1) */
        rowAndColumnForRelativeIndex(index: number) {
            var columnCount = this.lastColumn - this.firstColumn;
            var row = Math.floor(index / columnCount);
            var cell = {
                row: row,
                column: index - (row * columnCount)
            };

            return cell;
        }

        setTopLeft(topLeftBlock: CellBlock) {
            this.firstColumn = topLeftBlock.cellRange.firstColumn;
            this.firstBlockColumn = topLeftBlock.cellRange.firstBlockColumn;
            this.firstRow = topLeftBlock.cellRange.firstRow;
            this.firstBlockRow = topLeftBlock.cellRange.firstBlockRow;
        }

        setBottomRight(bottomRight: CellBlock) {
            this.lastColumn = bottomRight.cellRange.lastColumn;
            this.lastBlockColumn = bottomRight.cellRange.lastBlockColumn;
            this.lastRow = bottomRight.cellRange.lastRow;
            this.lastBlockRow = bottomRight.cellRange.lastBlockRow;
        }

        isEmpty() {
            return this.firstColumn === 0 &&
                this.lastColumn === 0 &&
                this.firstRow === 0 &&
                this.lastRow === 0 &&
                this.firstBlockColumn === 0 &&
                this.firstBlockRow === 0 &&
                this.lastBlockColumn === 0 &&
                this.lastBlockRow === 0;
        }

        equals(cellRange: ICellAndBlockRange) {
            if (!cellRange) {
                return false;
            }

            return this.firstColumn === cellRange.firstColumn &&
                this.lastColumn === cellRange.lastColumn &&
                this.firstRow === cellRange.firstRow &&
                this.lastRow === cellRange.lastRow &&
                this.firstBlockColumn === cellRange.firstBlockColumn &&
                this.firstBlockRow === cellRange.firstBlockRow &&
                this.lastBlockColumn === cellRange.lastBlockColumn &&
                this.lastBlockRow === cellRange.lastBlockRow;
        }
    }

    interface ICellBlockParent {
        presenter: TronGrid.IDataPresenter;
        provider: TronGrid.IDataProvider;
        columnWidths: number[];
        rowHeights: number[];
        visibleCellRange: ICellAndBlockRange;
    }

    /** A set of cells rendered as a single chunk */
    class CellBlock {
        bounds: Rectangle;
        markedForRemoval = false;
        isRendered = false;
        isVisible = false;
        isMeasured = false;

        block: HTMLDivElement;
        blockId: string;
        currentLeft = 0;
        currentTop = 0;

        constructor(
            public index: number,
            public cellRange: CellRange) {
            this.blockId = 'tgb_' + padLeft(this.index, 10);
        }

        show(parent: ICellBlockParent, container: HTMLElement) {
            this.markedForRemoval = false;
            if (!this.isRendered) {
                this.render(parent);
            }

            if (this.isVisible) {
                return;
            }

            this.isVisible = true;
            container.appendChild(this.block);
            ////insertSortedById(this.parent, this.block);
        }

        hide(container: HTMLElement) {
            this.markedForRemoval = false;
            if (!this.isVisible) {
                return;
            }

            this.isVisible = false;
            container.removeChild(this.block);
        }

        invalidate(measurementsChanged = false) {
            if (measurementsChanged) {
                this.isMeasured = false;
            }

            this.isRendered = false;
        }

        createBlockElement(presenter: TronGrid.IDataPresenter) {
            var b;
            if (presenter.createBlock) {
                b = presenter.createBlock(this.cellRange);
            } else {
                b = document.createElement('div');
            }

            b.setAttribute('id', this.blockId);
            b.className += ' block';
            this.bounds.apply(b);
            return b;
        }

        createCellElement(parent: ICellBlockParent, r: number, c: number): HTMLElement {
            var cell: HTMLElement;
            if (!!parent.presenter.createCell) {
                var size = {
                    width: parent.columnWidths[c],
                    height: parent.rowHeights[r]
                };

                cell = parent.presenter.createCell(r, c, size);
            } else {
                cell = document.createElement('div');
            }

            cell.setAttribute('id', 'tgc_' + r + '_' + c);
            cell.className += ' cell';
            return cell;
        }

        /** Binds to just the relevant portion of the full two-dimensional cells array */
        render(parent: ICellBlockParent) {
            if (!this.block) {
                this.block = this.createBlockElement(parent.presenter);
            }

            this.renderBlock(parent, this.block);

            this.isMeasured = true;
            this.isRendered = true;
        }

        renderBlock(parent: ICellBlockParent, block: HTMLDivElement) {
            if (block.childElementCount !== this.cellRange.cellCount()) {
                var fragment = document.createDocumentFragment();
                for (var r = this.cellRange.firstRow; r < this.cellRange.lastRow; r++) {
                    for (var c = this.cellRange.firstColumn; c < this.cellRange.lastColumn; c++) {
                        var cell = this.createCellElement(parent, r, c);
                        this.renderCell(parent, r, c, cell, false);
                        fragment.appendChild(cell);
                    }
                }

                this.block.appendChild(fragment);
            } else {
                // Recycle cells
                var cellIndex = 0;
                for (var r = this.cellRange.firstRow; r < this.cellRange.lastRow; r++) {
                    for (var c = this.cellRange.firstColumn; c < this.cellRange.lastColumn; c++) {
                        var cell = <HTMLElement>block.children[cellIndex];
                        this.renderCell(parent, r, c, cell, true);
                        cellIndex++;
                    }
                }
            }
        }

        renderCell(parent: ICellBlockParent, r: number, c: number, cell: HTMLElement, recycled: boolean) {
            var size = {
                width: parent.columnWidths[c],
                height: parent.rowHeights[r]
            };

            var cellData = parent.provider.cellData(r, c, parent.visibleCellRange);
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

            parent.presenter.renderCell(cell, cellData, r, c, size, recycled);
        }
    }

    export class Rectangle {
        right: number;
        bottom: number;

        constructor(public left: number, public top: number, public width: number = 0, public height: number = 0) {
            this.recalculate();
        }

        private prefix(style, prop, value) {
            var prefs = ['webkit', 'Moz', 'o', 'ms'];
            for (var pref in prefs) {
                style[prefs[pref] + prop] = value;
            }
        }

        compareX(x: number) {
            if (this.left > x)
                return -1;
            if (this.right < x)
                return 1;

            return 0;
        }

        compareY(y: number) {
            if (this.top > y)
                return -1;
            if (this.bottom < y)
                return 1;

            return 0;
        }

        /** Compares this rectangle to the point specified */
        compareToPoint(x: number, y: number) {
            if (this.left > x)
                return -1;
            if (this.right < x)
                return 1;
            if (this.top > y)
                return -1;
            if (this.bottom < y)
                return 1;

            return 0;
        }

        intersects(other: Rectangle) {
            // DEBUG: Check for nans
            if (!this.isValid()) {
                throw 'Cannot intersect this is invalid: [' + this.toString() + ']';
            }

            if (!other.isValid()) {
                throw 'Cannot intersect other is invalid: [' + other.toString() + ']';
            }

            return !(this.left > other.right ||
                this.right < other.left ||
                this.top > other.bottom ||
                this.bottom < other.top);
        }

        isValid() {
            return !isNaN(this.left) && !isNaN(this.right) && !isNaN(this.top) && !isNaN(this.bottom);
        }

        zeroSize() {
            this.width = 0;
            this.height = 0;
            this.recalculate();
        }

        /** Returns a new Rectangle expanded to the specified size, 
        centered on this rectangle if possible (will not give negative bounds) */
        resize(size: ISize) {
            var halfWidth = (this.width / 2) | 0;
            var halfHeight = (this.height / 2) | 0;
            var halfNewWidth = (size.width / 2) | 0;
            var halfNewHeight = (size.height / 2) | 0;
            var l = Math.max(0, (this.left - halfNewWidth) + halfWidth);
            var t = Math.max(0, (this.top - halfNewHeight) + halfHeight);
            return new Rectangle(l, t, size.width, size.height);
        }

        apply(element: HTMLElement) {
            element.style.top = this.top + 'px';
            element.style.left = this.left + 'px';
            element.style.width = this.width + 'px';
            element.style.height = this.height + 'px';
        }

        apply3dTranslate(element: HTMLElement) {
            this.prefix(element.style, 'Transform', 'translate3d(' + this.left + 'px,' + this.top + 'px, 0)');
            element.style.width = this.width + 'px';
            element.style.height = this.height + 'px';
        }

        toString() {
            return this.left + ',' + this.top + ',' + this.width + 'x' + this.height;
        }

        private recalculate() {
            this.right = this.left + this.width;
            this.bottom = this.top + this.height;
        }
    }

    export class TextPresenter implements IDataPresenter {
        renderCell(cell: HTMLElement, data: any) {
            cell.textContent = data;
        }
    }

    /** The main grid logic, which is attached to the Scroller via the binding handler */
    export class TronGrid {
        defaultOptions: IOptions = <any>{
            dataPresenter: new TextPresenter(),
            initialColumn: 0,
            initialRow: 0
        };

        renderQueued = 0;
        measureQueued = false;

        /** Number of milliseconds to give to rendering blocks in each frame */
        frameBudget = 8;
        options: IOptions = this.defaultOptions;
        dataSubscription: KnockoutSubscription;
        scrollSubscription: KnockoutSubscription;

        blockLefts: number[] = [];
        blockTops: number[] = [];
        blockWidths: number[] = [];
        blockHeights: number[] = [];

        columnWidths: number[] = [];
        rowHeights: number[] = [];
        totalHeight: number = 0;
        totalWidth: number = 0;
        provider: IDataProvider;
        presenter: IDataPresenter;
        content: HTMLDivElement;
        blockContainer: HTMLDivElement;
        blockContainerWidth = 0;
        blockContainerHeight = 0;
        blockContainerLeft = 0;
        blockContainerTop = 0;
        scrollBounds: Rectangle;
        scrollerSize: ISize = { width: 0, height: 0 };
        dataCellRange: ICellAndBlockRange = {
            firstColumn: 0,
            firstBlockColumn: 0,
            lastColumn: 0,
            lastBlockColumn: 0,
            firstRow: 0,
            firstBlockRow: 0,
            lastRow: 0,
            lastBlockRow: 0
        };
        visibleCellRange: ICellAndBlockRange = {
            firstColumn: 0,
            firstBlockColumn: 0,
            lastColumn: 0,
            lastBlockColumn: 0,
            firstRow: 0,
            firstBlockRow: 0,
            lastRow: 0,
            lastBlockRow: 0
        };

        private blocks: CellBlock[] = [];
        sizeChangedListener = this.sizeChanged.bind(this);

        constructor(public scroller: HTMLElement) {
            this.registerEventHandlers();
        }

        dispose() {
            this.disposeData();
            window.removeEventListener('resize', this.sizeChangedListener);
        }

        update(o: IOptions) {
            this.options = $.extend({}, this.defaultOptions, o);
            this.provider = this.options.dataProvider;
            this.presenter = this.options.dataPresenter;
            this.provider['dataForElement'] = (element: HTMLElement) => {
                var parts = element.id.split('_');
                var row = Number(parts[1]);
                var column = Number(parts[2]);
                if (!isNaN(row) && !isNaN(column)) {
                    var data = this.provider.cellData(row, column);
                    return data;
                }

                return null;
            };

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


            enqueue(() => {
                this.updateScrollBounds();
                this.enqueueMeasureAndRender();
            });
        }

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

        scrollChanged() {
            this.updateScrollBounds();
            if (!!this.options.behaviors) {
                for (var b = 0; b < this.options.behaviors.length; b++) {
                    if (this.options.behaviors[b].scrollChanged) {
                        this.options.behaviors[b].scrollChanged(this.scrollBounds);
                    }
                }
            }

            this.enqueueRender(2);
        }

        enqueueMeasureAndRender() {
            if (this.measureQueued) {
                return;
            }

            this.measureQueued = true;
            this.renderQueued = 1;
            (<any>window).requestAnimFrame(() => {
                this.measureQueued = false;
                this.renderQueued = 0;
                this.measure();
                this.render();
            });
        }

        enqueueRender(everyFrames: number = 1) {
            if (this.renderQueued) {
                return;
            }

            this.renderQueued = everyFrames;
            var self;
            self = () => {
                this.renderQueued--;
                if (this.renderQueued <= 0) {
                    this.renderQueued = 0;
                    this.render();
                } else {
                    (<any>window).requestAnimFrame(self);
                }
            }

            (<any>window).requestAnimFrame(self);
        }

        updateScrollBounds() {
            if (this.scrollerSize.width === 0 || this.scrollerSize.height === 0) {
                this.scrollerSize = {
                    width: this.scroller.clientWidth,
                    height: this.scroller.clientHeight
                };
            }

            this.scrollBounds = new Rectangle(
                this.scroller.scrollLeft,
                this.scroller.scrollTop,
                this.scrollerSize.width,
                this.scrollerSize.height);
        }

        measureColumns() {

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
        }

        measureRows() {
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
        }

        measure() {
            this.measureColumns();
            this.measureRows();

            var blockIndex = 0;
            for (var br = 0; br < this.blockHeights.length; br++) {
                for (var bc = 0; bc < this.blockWidths.length; bc++) {
                    var b = this.blocks[blockIndex];
                    if (!b) {
                        var cellRange = new CellRange();
                        cellRange.firstRow = br * this.provider.rowsPerBlock;
                        cellRange.lastRow = Math.min((br * this.provider.rowsPerBlock) + this.provider.rowsPerBlock, this.provider.rowCount);
                        cellRange.firstColumn = (bc * this.provider.columnsPerBlock);
                        cellRange.lastColumn = Math.min((bc * this.provider.columnsPerBlock) + this.provider.columnsPerBlock, this.provider.columnCount);
                        cellRange.firstBlockRow = br;
                        cellRange.lastBlockRow = br;
                        cellRange.firstBlockColumn = bc;
                        cellRange.lastBlockColumn = bc;
                        b = new CellBlock(
                            blockIndex,
                            cellRange);

                        this.blocks[blockIndex] = b;
                    }

                    b.bounds = new Rectangle(
                        this.blockLefts[bc],
                        this.blockTops[br],
                        this.blockWidths[bc],
                        this.blockHeights[br]);
                    ////if (!b.bounds.isValid()) {
                    ////    throw 'Invalid bounds ' + b.bounds.toString() + ', at index ' + blockIndex + '[' + br + ',' + bc + ']';
                    ////}

                    b.invalidate(true);
                    blockIndex++;
                }
            }
        }

        getTopMostVisibleBlockIndex(bounds: Rectangle) {
            var topBlockIndex = binarySearch(this.blockTops, bounds.top, (a, b) => {
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
        }

        private getVisibleCellRange(bounds: Rectangle): CellRange {
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
        }

        getLeftMostVisibleBlockIndex(bounds: Rectangle) {
            var leftBlockIndex = binarySearch(this.blockLefts, bounds.left, (a, b) => {
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
        }

        getBlockIndexForBlockRowAndColumn(blockRow: number, blockColumn: number) {
            return (blockRow * this.blockWidths.length) + blockColumn;
        }

        render() {
            if (!this.scrollBounds || !this.scrollBounds.isValid()) {
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
                    this.blocks[i].hide(this.blockContainer);

                    time = performance.now() - start;
                    if (time >= this.frameBudget) {
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
        }

        private renderBlock(block: CellBlock, bounds: Rectangle) {
            if (block.bounds.intersects(bounds)) {
                block.show(this, this.blockContainer);
                return true;
            }

            block.hide(this.blockContainer);
            return false;
        }

        getBlockIndex(row: number, column: number) {
            var br = Math.floor(row / this.provider.rowsPerBlock) || 0;
            var bc = Math.floor(column / this.provider.columnsPerBlock) || 0
            var i = (br * this.blockWidths.length) + bc;

            //// DEBUG: ASSERTION
            ////var b = this.blocks[i]; 
            ////if (b.cellRange.lastRow < row || b.cellRange.firstRow > row) {
            ////    throw "bad row";
            ////} else if (b.cellRange.lastColumn < column || b.cellRange.firstColumn > column) {
            ////    throw "bad column";
            ////}

            return i;
        }

        clearMeasurements() {
            for (var i = 0; i < this.blocks.length; i++) {
                this.blocks[i].hide(this.blockContainer);
            }

            this.blocks = [];
            this.blockHeights = [];
            this.blockLefts = [];
            this.blockTops = [];
            this.blockWidths = [];
            this.columnWidths = [];
            this.rowHeights = [];
            this.totalHeight = 0;
            this.totalWidth = 0;
        }

        /** Invalidates the rendered data, either wholesale or selectively by row, column or both, 
            If cell sizes are affected by data then sizeChanged should be set to true */
        dataChanged(change?: IDataChanged) {
            var hasRow = !!change && (typeof change.firstRow !== 'undefined' || typeof change.lastRow !== 'undefined');
            var hasColumn = !!change && (typeof change.firstColumn !== 'undefined' || typeof change.lastColumn !== 'undefined');
            var sizeChanged = (!!change && change.sizeChanged) || false;
            var cellCountChanged = sizeChanged && this.columnWidths.length !== this.provider.columnCount || this.rowHeights.length !== this.provider.rowCount;
            if (cellCountChanged) {
                this.clearMeasurements();
                this.enqueueMeasureAndRender();
                return;
            }

            // Invalidate all rows for the column range
            change.firstRow = typeof change.firstRow !== 'undefined' ? change.firstRow : 0;
            change.lastRow = typeof change.lastRow !== 'undefined' ? change.lastRow : this.rowHeights.length;
            change.firstColumn = typeof change.firstColumn !== 'undefined' ? change.firstColumn : 0;
            change.lastColumn = typeof change.lastColumn !== 'undefined' ? change.lastColumn : this.columnWidths.length;

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
        }

        sumRange(values: number[], startIndex: number, lastIndex: number) {
            var v = 0;
            for (var i = startIndex; i < Math.min(lastIndex, values.length); i++) {
                v += values[i];
            }

            return v;
        }

        scrollTo(scroll: IScrollRequest) {
            var alignLeftEdge = false;
            var alignTopEdge = false;
            var alignRightEdge = false;
            var alignBottomEdge = false;
            var leftEdge = 0;
            var rightEdge = 0;
            var topEdge = 0;
            var bottomEdge = 0;
            if (typeof scroll.firstColumn !== 'undefined') {
                leftEdge = this.sumRange(this.columnWidths, 0, scroll.firstColumn);
                alignLeftEdge = leftEdge < this.scroller.scrollLeft || !scroll.lastColumn;
            }

            if (typeof scroll.firstRow !== 'undefined') {
                topEdge = this.sumRange(this.rowHeights, 0, scroll.firstRow);
                alignTopEdge = topEdge < this.scroller.scrollTop || !scroll.lastRow;
            }

            if (typeof scroll.lastColumn !== 'undefined') {
                rightEdge = this.sumRange(this.columnWidths, 0, scroll.lastColumn + 1);
                alignRightEdge = rightEdge > this.scroller.scrollLeft + this.scrollerSize.width;
            }

            if (typeof scroll.lastRow !== 'undefined') {
                bottomEdge = this.sumRange(this.rowHeights, 0, scroll.lastRow + 1);
                alignBottomEdge = bottomEdge > this.scroller.scrollTop + this.scrollerSize.height;
            }

            if (!alignLeftEdge && !alignRightEdge && !alignTopEdge && !alignBottomEdge) {
                return;
            }

            ////console.log('scrollTo', { alignLeftEdge: alignLeftEdge, alignRightEdge: alignRightEdge });
            var scrollX = alignLeftEdge ? leftEdge : (alignRightEdge ? Math.max(0, rightEdge - this.scrollerSize.width) : this.scroller.scrollLeft);
            var scrollY = alignTopEdge ? topEdge : (alignBottomEdge ? Math.max(0, bottomEdge - this.scrollerSize.height) : this.scroller.scrollTop);
            if (!!scroll.duration) {
                $(this.scroller).animate({
                    scrollLeft: scrollX,
                    scrollTop: scrollY
                },
                    scroll.duration);
            } else {
                this.scroller.scrollLeft = scrollX;
                this.scroller.scrollTop = scrollY;
            }
        }

        subscribeData() {
            this.disposeData();
            this.dataSubscription = this.provider.dataChanged.subscribe(d => this.dataChanged(d));
            if (!!this.provider.scrollIntoView) {
                this.scrollSubscription = this.provider.scrollIntoView.subscribe((request) => this.scrollTo(request));
            }
        }

        disposeData() {
            if (!!this.dataSubscription) {
                this.dataSubscription.dispose();
                this.dataSubscription = null;
            }

            if (!!this.scrollSubscription) {
                this.scrollSubscription.dispose();
                this.scrollSubscription = null;
            }
        }

        registerEventHandlers() {
            ////$(window).resize(() => this.sizeChanged());
            window.addEventListener('resize', this.sizeChangedListener);

            ////ko.utils.domNodeDisposal.addDisposeCallback(this.scroller, () => $(this.scroller).off('resize'));
            ////ko.utils.registerEventHandler(this.scroller, 'resize', this.sizeChanged.bind(this));
            ko.utils.registerEventHandler(this.scroller, 'scroll', this.scrollChanged.bind(this));
        }

        sizeChanged() {
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
        }
    }
}
