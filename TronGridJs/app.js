/// <reference path="types/knockout.d.ts" />
/// <reference path="types/jquery.d.ts" />

var TronGrid = (function () {
    function TronGrid(element, options) {
        this.element = element;
        this.element.innerHTML += "The time is: ";
        this.span = document.createElement('div');
        this.element.appendChild(this.span);
        this.span.innerText = new Date().toUTCString();
    }
    TronGrid.prototype.start = function () {
        var _this = this;
        this.timerToken = setInterval(function () {
            return _this.span.innerHTML = new Date().toUTCString();
        }, 500);
    };

    TronGrid.prototype.stop = function () {
        clearTimeout(this.timerToken);
    };
    return TronGrid;
})();

var MainViewModel = (function () {
    function MainViewModel() {
    }
    return MainViewModel;
})();

window.onload = function () {
    var template = document.getElementById('template');
    var el = document.getElementById('content');
    var greeter = new TronGrid(el);
    greeter.start();
};
//# sourceMappingURL=app.js.map
