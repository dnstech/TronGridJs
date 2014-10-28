/// <reference path="types/knockout.d.ts" />
/// <reference path="types/jquery.d.ts" />

interface KnockoutBindingHandlers {
    tronGrid: KnockoutBindingHandler;
}

module TronGrid {
    export var enqueue: { (action: () => void): void; } = <any>window.setImmediate || function (f, args) { window.setTimeout(f, 0); };

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
        dataChanged: () => void;
    }

    export interface IDataPresenter {
        renderCell: (cell: HTMLElement, data: any, row?: number, column?: number) => void;
    }

    export interface IOptions {
        /** Number of rows per CellBlock */
        rowsPerBlock?: number;
        /** Number of columns per CellBlock */
        columnsPerBlock?: number;
        dataProvider: IDataProvider;
        dataPresenter?: IDataPresenter;
    }

    class CellBlock {
        bounds: Rectangle;
        isRendered: boolean = false;
        isVisible: boolean = false;
        block: HTMLDivElement;
        blockId: string;
        nextBlockId: string = '';
        cellCount = 0;

        constructor(
            public index: number,
            public firstRow: number,
            public lastRow: number,
            public firstColumn: number,
            public lastColumn: number,
            private parent: HTMLElement,
            private grid: TronGrid.TronGrid) {
            this.cellCount = (this.lastRow - this.firstRow) * (this.lastColumn - this.firstColumn);
            this.blockId = 'tgb_' + this.index;
            this.nextBlockId = 'tgb_' + (this.index + 1);
        }

        show() {
            if (!this.isRendered) {
                this.render();
            }

            if (this.isVisible) {
                return;
            }

            this.isVisible = true;
            this.block.style.display = 'inline-block';
            this.parent.insertBefore(this.block, document.getElementById(this.nextBlockId));
        }

        hide() {
            if (!this.isVisible) {
                return;
            }

            this.isVisible = false;
            this.block.style.display = 'none';
            this.parent.removeChild(this.block);
        }

        invalidate() {
            this.isRendered = false;
        }

        /** Binds to just the relevant portion of the full two-dimensional cells array */
        render() {
            if (!this.block) {
                this.block = document.createElement('div');
                this.block.setAttribute('id', this.blockId);
                this.block.style.width = this.bounds.width + 'px';
                this.block.style.height = this.bounds.height + 'px';
            }

            if (this.block.childElementCount !== this.cellCount) {
                for (var r = this.firstRow; r < this.lastRow; r++) {
                    for (var c = this.firstColumn; c < this.lastColumn; c++) {
                        this.renderNewCell(r, c);
                    }
                }
            } else {
                // Recycle cells
                var cellIndex = 0;
                for (var r = this.firstRow; r < this.lastRow; r++) {
                    for (var c = this.firstColumn; c < this.lastColumn; c++) {
                        var cellData = this.grid.provider.cellData(r, c);
                        var cell = <HTMLDivElement>this.block.children[cellIndex];
                        cell.style.width = this.grid.columnWidths[c] + 'px';
                        cell.style.height = this.grid.rowHeights[r] + 'px';
                        this.grid.presenter.renderCell(cell, cellData, r, c);
                        cellIndex++;
                    }
                }
            }

            this.isRendered = true;
        }

        renderNewCell(r: number, c: number) {
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

    export class Rectangle {
        right: number;
        bottom: number;

        constructor(public left: number, public top: number, public width: number = 0, public height: number = 0) {
            this.recalculate();
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

    class TextPresenter implements IDataPresenter {
        renderCell(cell: HTMLElement, data: any) {
            cell.innerText = data;
        }
    }

    /** The main grid logic, which is attached to the Scroller via the binding handler */
    export class TronGrid {
        defaultOptions: IOptions = <any>{
            dataPresenter: new TextPresenter(),
            rowsPerBlock: 10,
            columnsPerBlock: 10
        };

        renderQueued = false;
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

        private blocks: CellBlock[] = [];
        private scrollBounds: Rectangle;

        constructor(public scroller: HTMLElement) {
            this.registerEventHandlers();
        }

        update(o: IOptions) {
            this.options = o;
            $.extend(this.options, this.defaultOptions);
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
                            this.blockContainer,
                            this);

                        this.blocks[blockIndex] = b;
                    }

                    b.bounds = new Rectangle(
                        this.blockLefts[bc],
                        this.blockTops[br],
                        this.blockWidths[bc],
                        this.blockHeights[br]);
                    if (!b.bounds.isValid()) {
                        throw 'Invalid bounds ' + b.bounds.toString() + ', at index ' + blockIndex + '[' + br + ',' + bc + ']';
                    }

                    blockIndex++;
                }
            }          
        }

        render() {
            if (!this.scrollBounds.isValid()) {
                return;
            }

            var lookaheadBounds = this.scrollBounds.resize({
                    width: this.scrollBounds.width * 2,
                    height: this.scrollBounds.height * 2
                });

            var visibleBlockWidth = 0;
            var visibleBlockHeight = 0;
            var isTopLeftCell = true;
            var renderedRow = false;
            var blockColumnCount = (this.provider.columnCount / this.options.columnsPerBlock) | 0;
            for (var br = 0; br < this.blockHeights.length; br++) {
                renderedRow = false;
                var width = 0;
                for (var bc = 0; bc < this.blockWidths.length; bc++) {
                    var blockIndex = (br * this.blockWidths.length) + bc;
                    var visible = this.renderBlockAtIndex(blockIndex, lookaheadBounds);
                    renderedRow = renderedRow || visible;
                    if (renderedRow && isTopLeftCell) {
                        this.content.style.paddingLeft = this.blocks[blockIndex].bounds.left + 'px';
                        this.content.style.paddingTop = this.blocks[blockIndex].bounds.top + 'px';
                        isTopLeftCell = false;
                    }

                    if (visible) {
                        width += this.blocks[blockIndex].bounds.width;
                    }
                }

                if (renderedRow) {
                    visibleBlockWidth = width;
                    visibleBlockHeight += this.blocks[blockIndex].bounds.height;
                }
            }

            this.blockContainer.style.width = visibleBlockWidth + 'px';
            this.blockContainer.style.height = visibleBlockHeight + 'px';
        }

        renderBlockAtIndex(index: number, bounds: Rectangle) {
            var b = this.blocks[index];
            if (b.bounds.intersects(bounds)) {
                b.show();
                return true;
            } 

            b.hide();
            return false;
        }

        dataChanged() {
            ////this.disposeData();

            for (var i = 0; i < this.blocks.length; i++) {
                this.blocks[i].invalidate();
            }
           
            ////// TODO: Use ko.compareArrays to be more efficient and bind only affected ranges
            ////this.cells = updatedCells;

            this.measure();
            this.enqueueRender();
            ////this.subscribeData();
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
            //$(this.scroller).resize(() => this.sizeChanged());
            //ko.utils.domNodeDisposal.addDisposeCallback(this.scroller, () => $(this.scroller).off('resize'));
            ko.utils.registerEventHandler(this.scroller, 'resize', this.sizeChanged.bind(this));
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