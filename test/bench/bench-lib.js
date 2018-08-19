let table = document.createElement("table")
document.body.appendChild(table)

const bench = tests => {
    let t0 = performance.now();
    bench1(tests, 0, () => {
        console.log(`Finished tests in ${(performance.now() - t0).toFixed(0)} ms`)
        console.log(tests);
    })
}

const bench1 = (tests, i, onFinish) => {
    let test = tests[i] = Object.assign({
        nbIter: 10,
        description: tests[i].run.name,
        done: false,
        times: [],
        tr: table.insertRow()
    }, tests[i]);

    iter(test, 0, () => {
        let averageTime = test.times.reduce((a, b) => a + b, 0) / test.nbIter;
        log(test, averageTime.toFixed(3) + " ms")

        if (i < tests.length - 1) {
            setTimeout(() => bench1(tests, i + 1, onFinish), 10)
        } else {
            onFinish()
        }
    })
}

const iter = (test, i, onFinish) => {
    log(test, `test ${i + 1} / ${test.nbIter}`)

    let t0 = performance.now();
    test.run();
    test.times.push(performance.now() - t0)

    if (i < test.nbIter - 1) {
        setTimeout(() => iter(test, i + 1, onFinish), 10);
    } else {
        test.done = true;
        onFinish();
    }
}

const log = (test, msg) => { test.tr.textContent = test.description + ": " + msg }
