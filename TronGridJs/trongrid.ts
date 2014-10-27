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
        dataPresenter: IDataPresenter;
    }

    class CellBlock {
        boundingBox: Rectangle;
        isRendered: boolean = false;
        isVisible: boolean = false;
        block: HTMLDivElement;

        constructor(
            public firstRow: number,
            public lastRow: number,
            public firstColumn: number,
            public lastColumn: number,
            private parent: HTMLElement,
            private dataProvider: IDataProvider,
            private dataPresenter: IDataPresenter) {
        }

        show() {
            if (this.isRendered) {
                this.render();
            }

            if (this.isVisible) 
            this.isVisible = true;
            this.parent.appendChild(this.block);
        }

        hide() {
            this.isVisible = false;
        }

        /** Binds to just the relevant portion of the full two-dimensional cells array */
        render() {
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
        }
    }

    class Rectangle {
        right: number;
        bottom: number;

        constructor(public left: number, public top: number, public width: number = 0, public height: number = 0) {
            this.recalculate();
        }

        intersects(other: Rectangle) {
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
    class TronGrid {
        defaultOptions: IOptions = {
            dataProvider: null,
            dataPresenter: new TextPresenter(),
            rowsPerBlock: 10,
            columnsPerBlock: 10
        };

        options: IOptions = this.defaultOptions;
        dataSubscription: KnockoutSubscription;
        blocks: CellBlock[];
        scrollBounds: Rectangle;
        columnWidths: number[];
        rowHeights: number[];
        totalHeight: number = 0;
        totalWidth: number = 0;
        provider: IDataProvider;
        presenter: IDataPresenter;
        content: HTMLDivElement;

        constructor(public scroller: HTMLElement) {
            this.registerEventHandlers();
        }

        update(options: IOptions) {
            this.options = $.extend(options || {}, this.defaultOptions);
            this.provider = this.options.dataProvider;
            this.presenter = this.options.dataPresenter;

            this.content = document.createElement('div');
            this.scroller.appendChild(this.content);
            this.dataChanged();
        }

        scrollChanged() {
            this.scrollBounds = new Rectangle(
                this.scroller.scrollLeft,
                this.scroller.scrollTop,
                this.scroller.scrollWidth,
                this.scroller.scrollHeight);
        }

        measure() {
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
        }

        render() {
            var rangeIndex = this.scrollBounds.left;
            var blockIndex = 0;
            for (var r = 0; r < this.provider.rowCount; r += this.options.rowsPerBlock) {
                for (var c = 0; c < this.provider.columnCount; r += this.options.columnsPerBlock) {
                    var b = this.blocks[blockIndex];
                    if (!b) {
                         b = new CellBlock(
                            r,
                            r + this.options.rowsPerBlock,
                            c,
                            c + this.options.columnsPerBlock,
                            this.content,
                            this.provider,
                            this.presenter);
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
            ko.utils.registerEventHandler(this.scroller, 'resize', this.sizeChanged);
            ko.utils.registerEventHandler(this.scroller, 'scroll', this.scrollChanged);
        }

        sizeChanged() {
            this.scrollChanged();
        }
    }

    export class BindingHandler implements KnockoutBindingHandler {
        init(element: HTMLElement, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {
            var grid = new TronGrid(element);
            ko.utils.domData.set(element, 'trongrid', grid);
        }

        update(element: any, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {
            var o = valueAccessor();
            var grid: TronGrid = ko.utils.domData.get(element, 'trongrid');
            grid.update(o);
        }
    }
}

ko.bindingHandlers.tronGrid = new TronGrid.BindingHandler();