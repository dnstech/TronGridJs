/// <reference path="trongrid.ts" />
ko.bindingHandlers.tronGrid = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var grid = new TronGrid.TronGrid(element);
        ko.utils.domData.set(element, 'trongrid', grid);
        ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
            var grid = ko.utils.domData.get(element, 'trongrid');
            grid.dispose();
        });
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var o = ko.unwrap(valueAccessor());
        var grid = ko.utils.domData.get(element, 'trongrid');
        grid.update(o);
    }
};
ko.bindingHandlers.scrollSync = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        TronGrid.enqueue(function () {
            var options = ko.unwrap(valueAccessor());
            var selector = null;
            var isVertical = false;
            if (typeof options === 'string') {
                selector = options;
            }
            else {
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
            var update = function () {
                if (isVertical) {
                    container.height(sourceContainer.height());
                    je.scrollTop(source.scrollTop());
                }
                else {
                    container.width(sourceContainer.width());
                    je.scrollLeft(source.scrollLeft());
                }
            };
            update();
            source.on('scroll', update);
            jw.on('resize', update);
            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                source.off('scroll', update);
                jw.off('resize', update);
            });
        });
    }
};
var TronGrid;
(function (TronGrid) {
    var KnockoutTemplatePresenter = (function () {
        function KnockoutTemplatePresenter(template) {
            this.template = template;
        }
        KnockoutTemplatePresenter.prototype.renderCell = function (cell, data) {
            ko.renderTemplate(this.template, data, undefined, cell);
        };
        return KnockoutTemplatePresenter;
    })();
    TronGrid.KnockoutTemplatePresenter = KnockoutTemplatePresenter;
})(TronGrid || (TronGrid = {}));
//# sourceMappingURL=ko-trongrid.js.map