/// <reference path="trongrid.ts" />
/// <reference path="ko-trongrid.ts" />
/// <reference path="trongrid-scrollsync.ts" />

class MainViewModel {
    log = ko.observableArray([]);
    timer: any;
    lastUpdated = ko.observable('');
    syncIsActive = ko.observable(false);

    textOptions = {
        dataProvider: new SampleDataProvider(),
        dataPresenter: new TronGrid.TextPresenter(),
        //behaviors: [ new TronGrid.TouchScrollBehavior(this.log) ]
    };

    canvasOptions = {
        dataProvider: new SampleChartDataProvider(),
        dataPresenter: new SampleCanvasPresenter()
        //behaviors: [ new TronGrid.TouchScrollBehavior(this.log) ]
    };

    scrollSyncOptions = {
        dataProvider: new SampleDataProvider(),
        dataPresenter: new TronGrid.TextPresenter(),
        behaviors: [
            new TronGrid.ScrollSyncBehavior('#synchronizedScroller', '#scrollableContent', true, this.syncIsActive)
        ]
    };

    changeTextData() {
        if (!!this.timer) {
            window.clearInterval(this.timer);
            this.timer = null;
            return;
        }

        this.timer = setInterval(() => {
            var d = new Date();
            this.lastUpdated(d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds());
            this.textOptions.dataProvider.dataChanged({ });
        }, 500);
    }

    scrollTo() {
        this.textOptions.dataProvider.scrollIntoView({
            firstColumn: 10,
            firstRow: 10,
            lastColumn: 20,
            lastRow: 20
        });
    }

    scrollToAnimated() {
        this.textOptions.dataProvider.scrollIntoView({
            firstColumn: 40,
            firstRow: 40,
            lastColumn: 60,
            lastRow: 60,
            duration: 2000  // 2 seconds
        });
    }

    changeCanvasData() {
        if (!!this.timer) {
            window.clearInterval(this.timer);
            this.timer = null;
            return;
        }

        this.timer = setInterval(() => {
            var d = new Date();
            this.lastUpdated(d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds());
            this.canvasOptions.dataProvider.dataChanged({ });
        }, 500);
    }
}

class SampleChartDataProvider implements TronGrid.IDataProvider {
    rowCount = 100;
    columnCount = 10000;
    rowsPerBlock = 2;
    columnsPerBlock = 5;
    dataChanged = ko.observable<TronGrid.IDataChanged>();

    rowHeight(r) {
        return 200;
    }

    columnWidth(c) {
        return 100;
    }

    cellData(r, c) {
        var d = new Date();
        return d.getMilliseconds();
    }
}

class SampleCanvasPresenter implements TronGrid.IDataPresenter {
    pixelRatio = (function () {
        var ctx = document.createElement("canvas").getContext("2d"),
            dpr = window.devicePixelRatio || 1,
            bsr = (<any>ctx).webkitBackingStorePixelRatio ||
            (<any>ctx).mozBackingStorePixelRatio ||
            (<any>ctx).msBackingStorePixelRatio ||
            (<any>ctx).oBackingStorePixelRatio ||
            (<any>ctx).backingStorePixelRatio || 1;

        return dpr / bsr;
    })();


    createHiDPICanvas(w, h, ratio?) {
        if (!ratio) {
            ratio = this.pixelRatio;
        }

        var can = document.createElement("canvas");
        can.width = w * ratio;
        can.height = h * ratio;
        can.style.width = w + "px";
        can.style.height = h + "px";
        can.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
        return can;
    }

    createCell(row?: number, column?: number, size?: TronGrid.ISize) {
        return this.createHiDPICanvas(size.width, size.height);
    }

    renderCell(cell: HTMLCanvasElement, data: any, row: number, column: number, size: TronGrid.ISize) {
        var context = cell.getContext("2d");
        var h = (data / 5);
        context.clearRect(0, 0, size.width, size.height);
        context.beginPath();
        context.rect(5, size.height - h, size.width - 10, h);
        context.fillStyle = '#ccc';
        context.fill();
        context.lineWidth = 1;
        context.strokeStyle = 'white';
        context.stroke();
        context.font = '18pt Calibri';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText('R: ' + row + ' C: ' + column, size.width / 2, size.height - 50, size.width - 10);
        context.fillText('T: ' + data, size.width / 2, size.height - 30, size.width - 10);
    }
}

class SampleDataProvider implements TronGrid.IDataProvider {
    rowCount = 1000;
    columnCount = 100;
    rowsPerBlock = 10;
    columnsPerBlock = 20;
    scrollIntoView = ko.observable<TronGrid.IScrollRequest>();
    dataChanged = ko.observable<TronGrid.IDataChanged>(null);

    cellData(r, c) {
        var d = new Date();
        return '[' + r + ',' + c + '] ' + d.getMinutes() + ':' + d.getSeconds();
    }

    rowHeight(r) {
        return new Date().getSeconds() % 2 === 0 ? 50 : 25;
    }

    columnWidth(c) {
        return 100;
    }

}

ko.applyBindings(new MainViewModel());
