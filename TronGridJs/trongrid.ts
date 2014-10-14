
/// <reference path="types/knockout.d.ts" />
/// <reference path="types/jquery.d.ts" />
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

    interface IOptions {
        orientation: string;
        cellSize: (item) => ISize;
        template: (item) => string;
        viewportRows: number;
        viewportColumns: number;
        data: any;
    }

    class CellRange {
        boundingBox: Rectangle;
        html: string;
        isRendered: boolean = false;

        constructor(public row: number, public column: number, private measureCell: (cell) => ISize, private template: (cell) => string) {
        }

        /** Binds to just the relevant portion of the full two-dimensional cells array */
        bind(cells: any[][]) {
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
        }

        cellHtml(cell: any) {
            var d = ko.renderTemplate(this.template, cell);
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

    /** Represents a chunk of rendered content that can be moved and recycled */
    class Viewport {
        viewport: HTMLElement;
        currentRange: CellRange = null;

        render(range: CellRange) {
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
        }

        add(parent: HTMLElement) {
            this.viewport = document.createElement('div');
            parent.appendChild(this.viewport);
        }
    }

    /** The main grid logic, which is attached to the Scroller via the binding handler */
    class TronGrid {
        defaultOptions: IOptions = {
            orientation: 'rows',
            cellSize: (item) => {
                return {
                        width: 100,
                        height: 25
                    }
            },
            template: (item) => null,
            viewportRows: 10,
            viewportColumns: 10,
            data: null
        };

        options: IOptions = this.defaultOptions;
        cells: any[][];
        dataSubscription: KnockoutSubscription;
        ranges: CellRange[];
        viewports: Viewport[];
        scrollBounds: Rectangle;

        constructor(public scroller: HTMLElement) {
            this.registerEventHandlers();
        }

        update(options: IOptions) {
            this.options = $.extend(options || {}, this.defaultOptions);
            this.render();
        }

        render() {
            ////var rangeIndex = this.scrollBounds.left * this.r;
        }

        dataChanged() {
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
        }

        subscribeData() {
            var d = this.options.data;
            if (ko.isObservable(d)) {
                this.dataSubscription = (<KnockoutObservable<any>>d).subscribe(() => this.dataChanged());
            }
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
        }

        scrollChanged() {
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