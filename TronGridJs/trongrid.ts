/// <reference path="types/knockout.d.ts" />
/// <reference path="types/jquery.d.ts" />
// Binary search from https://gist.github.com/uberbrady/10605041

interface KnockoutBindingHandlers {
    tronGrid: KnockoutBindingHandler;
}


module TronGrid {
    interface ISize {
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

        constructor(
            public firstRow: number,
            public lastRow: number,
            public firstColumn: number,
            public lastColumn: number,
            private parent: HTMLElement,
            private grid: TronGrid.TronGrid) {
        }

        show() {
            if (!this.isRendered) {
                this.render();
            }

            if (this.isVisible) {
                return;
            }

            this.isVisible = true;
            this.parent.appendChild(this.block);
        }

        hide() {
            if (!this.isVisible) {
                return;
            }

            this.isVisible = false;
            this.block.style.display = 'none';
        }

        /** Binds to just the relevant portion of the full two-dimensional cells array */
        render() {
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
        }
    }

    class Rectangle {
        right: number;
        bottom: number;

        constructor(public left: number, public top: number, public width: number = 0, public height: number = 0) {
            this.recalculate();
        }

        intersects(other: Rectangle) {
            // DEBUG: Check for nans
            if (isNaN(this.left) || isNaN(this.right) || isNaN(this.top) || isNaN(this.bottom)) {
                return false;
            }

            return !(this.left > other.right ||
                     this.right < other.left ||
                     this.top > other.bottom ||
                     this.bottom < other.top);
        }

        zeroSize() {
            this.width = 0;
            this.height = 0;
            this.recalculate();
        }

        growBy(size: ISize) {
            this.width += size.width;
            this.height += size.height;
            this.recalculate();
        }

        apply(element: HTMLElement) {
            element.style.top = this.top + 'px';
            element.style.left = this.left + 'px';
            element.style.bottom = this.bottom + 'px';
            element.style.right = this.right + 'px';
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

            this.content = document.createElement('div');
            this.scroller.appendChild(this.content);
            this.updateScrollBounds();
            this.dataChanged();
        }

        scrollChanged() {
            this.updateScrollBounds();
            this.render();
        }

        updateScrollBounds() {
            this.scrollBounds = new Rectangle(
                this.scroller.scrollLeft,
                this.scroller.scrollTop,
                this.scroller.offsetWidth,
                this.scroller.offsetHeight);
        }

        measureColumns() {
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
        }

        measureRows() {
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
        }

        measure() {
            if (this.columnWidths.length !== this.provider.columnCount) {
                this.measureColumns();
            }

            if (this.rowHeights.length !== this.provider.rowCount) {
                this.measureRows();
            }

            this.content.style.width = this.totalWidth + 'px';
            this.content.style.height = this.totalHeight + 'px';
        }

        render() {
            var rangeIndex = this.scrollBounds.left;
            var isTopLeftCell = true;
            var renderedRow = false;
            for (var r = 0; r < this.provider.rowCount; r += this.options.rowsPerBlock) {
                renderedRow = false;
                for (var c = 0; c < this.provider.columnCount; c += this.options.columnsPerBlock) {
                    var blockIndex = (r * this.provider.columnCount) + c;
                    var b = this.blocks[blockIndex];
                    if (!b) {
                         b = new CellBlock(
                            r,
                            r + this.options.rowsPerBlock,
                            c,
                            c + this.options.columnsPerBlock,
                            this.content,
                            this);

                        // AC: This performs a Divide, Floor, Multiply to give the Block Column Index and Block Row Index;
                        var bc = (c / this.options.columnsPerBlock | 0) * this.options.columnsPerBlock;
                        var br = (r / this.options.rowsPerBlock | 0) * this.options.rowsPerBlock;
                        b.bounds = new Rectangle(
                            this.blockLefts[bc],
                            this.blockTops[br],
                            this.blockWidths[bc],
                            this.blockHeights[br]); 
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
        }

        dataChanged() {
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
        }

        subscribeData() {
            var d = this.options.dataProvider;
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