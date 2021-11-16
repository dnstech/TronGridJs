# TronGridJs

## What is it?
It's very old is what.
A virtualized JavaScript grid layout system with support for non-uniform row heights and column widths.

## When would I use this?

You should use this when:
* You have a *LOT* of data you want your users to scroll through in their browser.
* Your presentation can be sliced up into some kind of cell based layout.
* Performance matters to you. 

TronGrid is built to keep your browser scrolling fluidly through your data at 60fps. 

Some examples of use cases include:

 * Timelines
 * Gantt Charts
 * Data Grids
 * Tables
 * Grouped Lists
 * Wrapped Card Layouts
 * Maps

## How does it work?

TronGrid's performance comes from only doing the rendering work when necessary and only doing as much as is possible within a given frame time budget. This ensures that your browser remains responsive even when there is a lot of data to render.

1. TronGrid has a measure pass which will only run once unless a size change is raised.
2. A render pass is enqueud which will render only the visible cell range and invalidates at a block level. 

   > At least one block will be rendered for every frame, this should be your deciding factor on how big each block should be, the rowsPerBlock and columnsPerBlock have a large impact on the interactivity and performance of your grid, try playing around with them to get the best fit for your workload.

## How do I get started?

In this example we will be using TypeScript and TronGrid's knockout binding (although could it can be used with just plain Javascript)

1. Add the following script files to your html file: 

        <script src="trongrid.js"></script>
        <script src="ko-trongrid.js"></script>

2. Add a div to your page with the TronGrid binding (you can add as many of these to your page as you need)

    ```
        <div data-bind="tronGrid: gridOptions"></div>
    ``` 

3. You could make your ViewModel implement TronGrid.IOptions directly, but in this case we are adding an Options object that defines the behaviour of this Grid:

    ```TypeScript
        class MainViewModel {
            gridOptions: TronGrid.IOptions = {
                dataProvider: new MyDataProvider(),
                dataPresenter: new MyDataPresenter(),
                rowsPerBlock: 10,
                columnsPerBlock: 10
            }
        }
    ```

    Here we have defined a Data Provider and a Data Presenter.
    
    Data Providers are responsible for giving data to the grid when it needs it. It might talk to a server witha Ajax requests or it might generate data procedurally, it doesn't matter, as long as it can provide data for a cell based on a (zero bound) row number and column number.
    Data Presenter's are responsible for interacting with the DOM, presenting the data to the screen. 


4. Create the Data Provider class.

    ```TypeScript
        class MyDataProvider implements TronGrid.IDataProvider {
            columnCount = 1000;
            rowCount = 10000;
            dataChanged = ko.observable<TronGrid.IDataChanged>();
            rowHeight(row: number) {
                return 50;
            }

            columnWidth(column: number) {
                return 100;
            }

            cellData(row: number, column: number) {
                return row + ", " + column;
            }
        }
    ```

    In the above example we are declaring a 10,000,000 cell table (1,000 columns x 10,000 rows)

    > Note: If you change these values or any measurements, you must call:
        
    ```TypeScript
        this.dataChanged({ sizeChanged: true });
    ```
    
    When TronGrid first loads it will interrogate the data provider as to the measurements for each column and each row, this will tell it how big the scrollable area needs to be.

5. Create the Data Presenter class.

    ```TypeScript
        class MyDataPresenter implements TronGrid.IDataPresenter {
             renderCell(cell:HTMLDivElement, data: any, row: number, column: number) {
                cell.textContent = data;
                if (row % 2) {
                    cell.className += ' odd-row';
                }

                if (column % 2) {
                    cell.className += ' odd-column';
                }
             }
        }
    ```

    In this example we are just setting text content. But you could use any templating engine you like in here.

    > It is recommended you implement just basic DOM manipulations yourself if possible, performance is a major factor in the renderCell area of your code.