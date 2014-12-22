/// <reference path="trongrid.ts" />

interface KnockoutBindingHandlers {
    tronGrid: KnockoutBindingHandler;
    scrollSync: KnockoutBindingHandler;
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

ko.bindingHandlers.scrollSync = {
    init: (element, valueAccessor, allBindingsAccessor) => {
        TronGrid.enqueue(() => {
            var options = ko.unwrap(valueAccessor());
            var selector: string = null;
            var isVertical = false;
            if (typeof options === 'string') {
                selector = options;
            } else {
                selector = options.selector;
                isVertical = options.orientation === 'vertical';
            }
            var sourceContainer = $(element).closest(selector);

            if (!sourceContainer.length) {
                sourceContainer = $(selector + ':visible');
            }

            var source = sourceContainer.parent();

            var container = $(element).find(allBindingsAccessor()['content']);

            var je = $(element);
            var jw = $(window);
            var update = () => {
                if (isVertical) {
                    container.height(sourceContainer.height());
                    je.scrollTop(source.scrollTop());
                } else {
                    container.width(sourceContainer.width());
                    je.scrollLeft(source.scrollLeft());
                }
            };

            update();
            source.on('scroll', update);
            jw.on('resize', update);

            ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
                source.off('scroll', update);
                jw.off('resize', update);
            });
        });
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