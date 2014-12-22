/// <reference path="trongrid.ts" />

interface KnockoutBindingHandlers {
    tronGrid: KnockoutBindingHandler;
}

ko.bindingHandlers.tronGrid = {
    init: function (element: HTMLElement, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {
        var grid = new TronGrid.TronGrid(element);
        ko.utils.domData.set(element, 'trongrid', grid);

        ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
            var grid: TronGrid.TronGrid = ko.utils.domData.get(element, 'trongrid');
            grid.dispose();
        });
    },
    update: function (element: any, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext) {
        var o = ko.unwrap(valueAccessor());
        var grid: TronGrid.TronGrid = ko.utils.domData.get(element, 'trongrid');
        grid.update(o);
    }
};

module TronGrid {
    export class KnockoutTemplatePresenter implements TronGrid.IDataPresenter {
        constructor(template: string);
        constructor(template: (data: any) => string);
        constructor(public template: any) {
        }

        renderCell(cell: HTMLElement, data: any) {
            ko.renderTemplate(this.template, data, undefined, cell);
        }
    }
}