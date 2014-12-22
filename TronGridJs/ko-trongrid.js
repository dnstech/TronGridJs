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
