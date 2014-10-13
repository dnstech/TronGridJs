/// <reference path="types/knockout.d.ts" />
/// <reference path="types/jquery.d.ts" />
interface ITronGridOptions {
    primaryOrientation: string;
    rowSize: (item) => number;
    template: string;
}

class TronGrid {
    element: HTMLElement;
    span: HTMLElement;
    timerToken: number;

    constructor(element: HTMLElement, options?: ITronGridOptions) {
        this.element = element;
        this.element.innerHTML += "The time is: ";
        this.span = document.createElement('div');
        this.element.appendChild(this.span);
        this.span.innerText = new Date().toUTCString();
    }

    start() {
        this.timerToken = setInterval(() => this.span.innerHTML = new Date().toUTCString(), 500);
    }

    stop() {
        clearTimeout(this.timerToken);
    }

}

class MainViewModel {

}

window.onload = () => {
    var template = document.getElementById('template');
    var el = document.getElementById('content');
    var greeter = new TronGrid(el);
    greeter.start();
};