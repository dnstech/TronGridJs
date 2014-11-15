/// <reference path="trongrid.ts" />

class MainViewModel {
    log = ko.observableArray([]);
    timer: any;
    lastUpdated = ko.observable('');

    textOptions: TronGrid.IOptions = {
        dataProvider: new SampleDataProvider(),
        dataPresenter: new TronGrid.TextPresenter(),
        rowsPerBlock: 10,
        columnsPerBlock: 20
        //behaviors: [ new TronGrid.TouchScrollBehavior(this.log) ]
    }

    canvasOptions: TronGrid.IOptions = {
        dataProvider: new SampleChartDataProvider(),
        dataPresenter: new SampleCanvasPresenter(),
        rowsPerBlock: 2,
        columnsPerBlock: 10
        //behaviors: [ new TronGrid.TouchScrollBehavior(this.log) ]
    }

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

    dataChanged = ko.observable<TronGrid.IDataChanged>();
}

class SampleCanvasPresenter implements TronGrid.IDataPresenter {
    createCell(row?: number, column?: number) {
        return document.createElement('canvas');
    }

    renderCell(cell: HTMLCanvasElement, data: any, row: number, column: number, size: TronGrid.ISize) {
        cell.width = size.width;
        cell.height = size.height;
        var context = cell.getContext("2d");
        var h = (data / 5);
        context.clearRect(0, 0, cell.width, cell.height);
        context.beginPath();
        context.rect(5, cell.height - h, cell.width - 10, h);
        context.fillStyle = '#ccc';
        context.fill();
        context.lineWidth = 1;
        context.strokeStyle = 'white';
        context.stroke();
        context.font = '18pt Calibri';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText('R: ' + row + ' C: ' + column, cell.width / 2, cell.height - 50, cell.width - 10);
        context.fillText('T: ' + data, cell.width / 2, cell.height - 30, cell.width - 10);
    }
}

class SampleDataProvider implements TronGrid.IDataProvider {
    rowCount = 1000;
    columnCount = 100;

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

    dataChanged = ko.observable<TronGrid.IDataChanged>(null);
}

ko.applyBindings(new MainViewModel());
