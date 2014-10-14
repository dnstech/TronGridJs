
/// <reference path="types/knockout.d.ts" />
/// <reference path="types/jquery.d.ts" />
interface KnockoutBindingHandlers {
    tronGrid: KnockoutBindingHandler;
}

interface ITronGridOptions {
    orientation: string;
    cellSize: (item) => {
        /** Width in Pixels */
        width: number;
        /** Height in Pixels */
        height: number;
    };
    template: (item) => string;
    data: any;
}

class TronGridCellRange {
    x: number;
    y: number;
    width: number;
    height: number;
    html: string;
    isRendered: boolean = false;

    constructor(public row: number, public column: number) {
    }

    /** Binds to just the relevant portion of the full two-dimensional cells array */
    bind(cells: any[][]) {
        this.html = '';
        for (var r = this.row; r++; r < cells.length) {
            for (var c = this.column; c++; c < cells[r].length) {
                var item = cells[r][c];
                // TODO: Add custom cell css class selection here
                this.html += '<div id="tg_' + r + '_' + c + '" class="cell">' + item + '</div>';
            }
        }
    }
}

class TronGridCellRangeViewport {
    viewport: HTMLElement;
    currentRange: TronGridCellRange = null;

    render(range: TronGridCellRange) {
        if (this.currentRange !== null) {
            this.currentRange.isRendered = false;
        }

        this.viewport.style.top = range.y + 'px';
        this.viewport.style.left = range.x + 'px';
        this.viewport.style.width = range.width + 'px';
        this.viewport.style.height = range.height + 'px';
        this.viewport.innerHTML = range.html;
        range.isRendered = true;
        this.currentRange = range;
    }

    add(parent: HTMLElement) {
        this.viewport = document.createElement('div');
        parent.appendChild(this.viewport);
    }
}

class TronGrid {
    defaultOptions: ITronGridOptions = {
        orientation: 'rows',
        cellSize: (item) => {
            return {
                width: 100,
                height: 25
            }
        },
        template: (item) => null,
        data: null
    };
    element: HTMLElement;
    options: ITronGridOptions = this.defaultOptions;
    cells: any[][];
    dataSubscription: KnockoutSubscription;
    constructor(element: HTMLElement) {
        ko.utils.domNodeDisposal.addDisposeCallback(element, () => this.dispose());
    } 

    update(options: ITronGridOptions) {
        this.options = $.extend(options || {}, this.defaultOptions);
        this.render();
    }

    render() {
        var d = this.options.data;
        if (ko.isObservable(d)) {
            this.dataSubscription = (<KnockoutObservable<any>>d).subscribe(() => this.dataChanged());
        }
    }

    dataChanged() {
    }

    dispose() {
        if (!!this.dataSubscription) {
            this.dataSubscription.dispose();
            this.dataSubscription = null;
        }
    }
}

class TronGridBindingHandler implements KnockoutBindingHandler {
    init(element: HTMLElement, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {
        var grid = new TronGrid(element);
        $(element).data('trongrid', grid);
    }

    update(element: any, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {
        var o = valueAccessor();
        var grid:TronGrid = $(element).data('trongrid');
        grid.update(o);
    }
}

ko.bindingHandlers.tronGrid = new TronGridBindingHandler();