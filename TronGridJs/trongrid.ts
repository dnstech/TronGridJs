/// <reference path="types/knockout.d.ts" />
/// <reference path="types/jquery.d.ts" />

interface KnockoutBindingHandlers {
    tronGrid: KnockoutBindingHandler;
}

module TronGrid {
    export var enqueue: { (action: () => void): void; } = !!<any>window.setImmediate ? function (f) {
            window.setImmediate(f);
        } : function (f) {
            window.setTimeout(f, 1000 / 60);
        };

    export interface ISize {
        /** Width in Pixels */
        width: number;
        /** Height in Pixels */
        height: number;
    }

    export interface IDataProvider {
        rowHeight: (index) => number;
        columnWidth: (index) => number;
        cellData: (row: number, column: number) => any;
        columnCount: number;
        rowCount: number;
        dataChanged: (row?: number, column?: number) => void;
    }

    export interface IDataPresenter {
        renderCell: (cell: HTMLElement, data: any, row?: number, column?: number) => void;
    }

    export interface IOptions {
        dataProvider: IDataProvider;

        /** Implementation of a renderer that fill's in a cell's content, defaults to TextPresenter */
        dataPresenter?: IDataPresenter;

        /** Number of rows per CellBlock */
        rowsPerBlock?: number;

        /** Number of columns per CellBlock */
        columnsPerBlock?: number;

        initialColumn?: number;
        initialRow?: number;
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

    class CellBlock {
        bounds: Rectangle;
        markedForRemoval = false;
        isRendered = false;
        isVisible = false;
        isMeasured = false;

        block: HTMLDivElement;
        blockId: string;
        cellCount = 0;

        constructor(
            public index: number,
            public firstRow: number,
            public lastRow: number,
            public firstColumn: number,
            public lastColumn: number,
            public blockRow: number,
            public blockColumn: number,
            private parent: HTMLElement,
            private grid: TronGrid.TronGrid) {
            this.cellCount = (this.lastRow - this.firstRow) * (this.lastColumn - this.firstColumn);
            this.blockId = 'tgb_' + padLeft(this.index, 10);
        }

        show() {
            this.markedForRemoval = false;
            if (!this.isRendered) {
                this.render();
            }

            if (this.isVisible) {
                return;
            }

            this.isVisible = true;
            insertSortedById(this.parent, this.block);
        }

        hide() {
            this.markedForRemoval = false;
            if (!this.isVisible) {
                return;
            }

            this.isVisible = false;
            this.parent.removeChild(this.block);
        }

        invalidate(measurementsChanged = false) {
            if (measurementsChanged) {
                this.isMeasured = false;
            }

            this.isRendered = false;
        }

        createBlockElement() {
            var b = document.createElement('div');
            b.setAttribute('id', this.blockId);
            b.setAttribute('class', 'block');
            b.style.width = this.bounds.width + 'px';
            b.style.height = this.bounds.height + 'px';
            return b;
        }

        createCellElement(r: number, c: number) {
            var cell = document.createElement('div');
            cell.setAttribute('id', 'tgc_' + r + '_' + c);
            cell.setAttribute('class', 'cell');
            return cell;
        }

        /** Binds to just the relevant portion of the full two-dimensional cells array */
        render() {
            if (!this.block) {
                this.block = this.createBlockElement();
            }

            if (this.block.childElementCount !== this.cellCount) {
                for (var r = this.firstRow; r < this.lastRow; r++) {
                    for (var c = this.firstColumn; c < this.lastColumn; c++) {
                        var cell = this.createCellElement(r, c);
                        this.renderCell(r, c, cell);
                        this.block.appendChild(cell);
                    }
                }
            } else {
                // Recycle cells
                var cellIndex = 0;
                for (var r = this.firstRow; r < this.lastRow; r++) {
                    for (var c = this.firstColumn; c < this.lastColumn; c++) {
                        var cell = <HTMLDivElement>this.block.children[cellIndex];
                        this.renderCell(r, c, cell);
                        cellIndex++;
                    }
                }
            }

            this.isMeasured = true;
            this.isRendered = true;
        }

        renderCell(r: number, c: number, cell: HTMLDivElement) {
            var cellData = this.grid.provider.cellData(r, c);
            if (!this.isMeasured) {
                cell.style.width = this.grid.columnWidths[c] + 'px';
                cell.style.height = this.grid.rowHeights[r] + 'px';
            }

            this.grid.presenter.renderCell(cell, cellData, r, c);
        }
    }

    export class Rectangle {
        right: number;
        bottom: number;

        constructor(public left: number, public top: number, public width: number = 0, public height: number = 0) {
            this.recalculate();
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
            element.style.bottom = this.bottom + 'px';
            element.style.right = this.right + 'px';
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

    export class KnockoutTemplatePresenter implements IDataPresenter {
        constructor(template: string);
        constructor(template: (data:any) => string);
        constructor(public template: any) {
        }

        renderCell(cell: HTMLElement, data: any) {
            ko.renderTemplate(this.template, data, undefined, cell);
        }
    }

    /** The main grid logic, which is attached to the Scroller via the binding handler */
    export class TronGrid {
        defaultOptions: IOptions = <any>{
            dataPresenter: new TextPresenter(),
            rowsPerBlock: 10,
            columnsPerBlock: 10,
            initialColumn: 0,
            initialRow: 0
        };

        renderQueued = false;
        measureQueued = false;
        options: IOptions = this.defaultOptions;
        dataSubscription: KnockoutSubscription;

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

        private blocks: CellBlock[] = [];
        private visibleBlocks: CellBlock[] = [];
        private scrollBounds: Rectangle;

        constructor(public scroller: HTMLElement) {
            this.registerEventHandlers();
        }

        update(o: IOptions) {
            this.options = $.extend({}, this.defaultOptions, o);
            this.provider = this.options.dataProvider;
            this.presenter = this.options.dataPresenter;
            this.provider.dataChanged = this.dataChanged.bind(this);
            this.content = document.createElement('div');
            this.scroller.appendChild(this.content);
            this.blockContainer = document.createElement('div');
            this.content.appendChild(this.blockContainer);
            this.updateScrollBounds();
            this.dataChanged();
        }

        scrollChanged() {
            this.updateScrollBounds();
            this.enqueueRender();
        }

        enqueueMeasureAndRender() {
            if (this.measureQueued) {
                return;
            }

            this.measureQueued = true;
            this.renderQueued = true;
            enqueue(() => {
                this.measureQueued = false;
                this.renderQueued = false;
                this.measure();
                this.render();
            });
        }

        enqueueRender() {
            if (this.renderQueued) {
                return;
            }

            this.renderQueued = true;

            enqueue(() => {
                this.renderQueued = false;
                this.render();
            });
        }

        updateScrollBounds() {
            this.scrollBounds = new Rectangle(
                this.scroller.scrollLeft,
                this.scroller.scrollTop,
                this.scroller.clientWidth,
                this.scroller.clientHeight);
        }

        measureColumns() {
            var blockColumn = 0;
            var blockLeft = 0;
            var blockWidth = 0;
            var previousTotalWidth = this.totalWidth;
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

            if (previousTotalWidth != this.totalWidth) {
                this.content.style.width = this.totalWidth + 'px';
            }
        }

        measureRows() {
            var blockRow = 0;
            var blockTop = 0;
            var blockHeight = 0;
            var previousTotalHeight = this.totalHeight;
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

            if (this.totalHeight != previousTotalHeight) {
                this.content.style.height = this.totalHeight + 'px';
            }
        }

        measure() {
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
                        b = new CellBlock(
                            blockIndex,
                            br * this.options.rowsPerBlock,
                            (br * this.options.rowsPerBlock) + this.options.rowsPerBlock,
                            (bc * this.options.columnsPerBlock),
                            (bc * this.options.columnsPerBlock) + this.options.columnsPerBlock,
                            br,
                            bc,
                            this.blockContainer,
                            this);

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

        render() {
            if (!this.scrollBounds.isValid()) {
                return;
            }

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

            for (var br = topBlockIndex; br < this.blockHeights.length; br++) {
                renderedRow = false;
                var width = 0;
                for (var bc = leftBlockIndex; bc < this.blockWidths.length; bc++) {
                    var blockIndex = (br * this.blockWidths.length) + bc;
                    var block = this.blocks[blockIndex];
                    var visible = this.renderBlock(block, lookaheadBounds);
                    renderedRow = renderedRow || visible;
                    if (renderedRow && isTopLeftCell) {
                        if (this.blockContainerLeft !== block.bounds.left) {
                            this.blockContainerLeft = block.bounds.left;
                            this.content.style.paddingLeft = block.bounds.left + 'px';
                        }

                        if (this.blockContainerTop !== block.bounds.top) {
                            this.blockContainerTop = block.bounds.top;
                            this.content.style.paddingTop = block.bounds.top + 'px';
                        }

                        isTopLeftCell = false;
                    }

                    if (visible) {
                        width += this.blocks[blockIndex].bounds.width;
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
                }
            }

            if (this.blockContainerWidth !== visibleBlockWidth) {
                this.blockContainerWidth = visibleBlockWidth;
                this.blockContainer.style.width = visibleBlockWidth + 'px';
            }

            if (this.blockContainerHeight !== visibleBlockHeight) {
                this.blockContainerHeight = visibleBlockHeight;
                this.blockContainer.style.height = visibleBlockHeight + 'px';
            }
        }

        private renderBlock(block: CellBlock, bounds: Rectangle) {
            if (block.bounds.intersects(bounds)) {
                block.show();
                return true;
            }

            block.hide();
            return false;
        }

        getBlockIndex(row: number, column: number) {
            var br = (((row * this.provider.columnCount) / this.options.columnsPerBlock) | 0);
            var bc = (column / this.options.columnsPerBlock) | 0
            return br + bc;
        }

        /** Invalidates the rendered data, either wholesale or selectively by row, column or both, 
            If cell sizes are affected by data then sizeChanged should be set to true */
        dataChanged(row?: number, column?: number, sizeChanged: boolean = false) {
            var hasRow = typeof row !== 'undefined';
            var hasColumn = typeof column !== 'undefined';

            // Row set, but column undefined invalidates an entire row,
            // Column set, but row undefined invalidates an entire column.
            // Both row and column set invalidates a cell.
            if (hasRow && hasColumn) {
                this.blocks[this.getBlockIndex(row, column)].invalidate(sizeChanged);
            } else if (hasColumn) {
                for (var r = column; r < this.blocks.length; r += this.blockWidths.length) {
                    this.blocks[r].invalidate(sizeChanged);
                }
            } else if (hasRow) {
                for (var c = this.blockWidths.length * row; c < this.blockWidths.length; c++) {
                    this.blocks[c].invalidate(sizeChanged);
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

        subscribeData() {
            var d = this.options.dataProvider;
            d.dataChanged = this.dataChanged;
            ////if (ko.isObservable(d)) {
            ////    this.dataSubscription = (<KnockoutObservable<any>>d).subscribe(() => this.dataChanged());
            ////}
        }

        disposeData() {
            if (!!this.dataSubscription) {
                this.dataSubscription.dispose();
                this.dataSubscription = null;
            }
        }

        registerEventHandlers() {
            $(this.scroller).resize(() => this.sizeChanged());
            ////ko.utils.domNodeDisposal.addDisposeCallback(this.scroller, () => $(this.scroller).off('resize'));
            ////ko.utils.registerEventHandler(this.scroller, 'resize', this.sizeChanged.bind(this));
            ko.utils.registerEventHandler(this.scroller, 'scroll', this.scrollChanged.bind(this));
        }

        sizeChanged() {
            this.scrollChanged();
        }
    }
}

ko.bindingHandlers.tronGrid = {
    init: function (element: HTMLElement, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {
        var grid = new TronGrid.TronGrid(element);
        ko.utils.domData.set(element, 'trongrid', grid);
    },
    update: function (element: any, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {
        var o = ko.unwrap(valueAccessor());
        var grid: TronGrid.TronGrid = ko.utils.domData.get(element, 'trongrid');
        grid.update(o);
    }
};
