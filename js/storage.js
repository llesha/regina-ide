/* settings:
    1. panel sizes
    2. theme
    3. autosave, seconds
    4. console entries, number

    files
    file tree files and their contents
*/
import {createTree} from './filetree.js';

const holdingReset = false;
let interval = null;

document.getElementById('reset-all').onmousedown = () => {
    let index = 3;
    document.getElementById('reset-all').innerText = 'hold ' + index + '...';
    index--;
    interval = setInterval(function() {
        if (index == 0) {
            clearInterval(interval);
            document.getElementById('reset-all').innerText = 'succesful!';
            localStorage.clear();
            location.reload();
            setDefaults();
        } else document.getElementById('reset-all').innerText = 'hold ' + index + '...';
        index--;
    }, 1000);
};

function stopReset() {
    clearInterval(interval);
    document.getElementById('reset-all').innerText = 'do reset';
}

function saveResult() {
    var svgData = document.getElementById("svg-result").getElementsByTagName("svg")[0].outerHTML;
    var svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
    var svgUrl = URL.createObjectURL(svgBlob);
    var downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = "result"+(new Date().getUTCMilliseconds())+".svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

document.getElementById('reset-all').onmouseup = () => stopReset();
document.getElementById('reset-all').onmouseleave = () => stopReset();
document.getElementById('save-button').onclick = () => saveResult();

document.getElementById('theme-button').onclick = () => {
    if (document.documentElement.getAttribute('data-theme') == 'dark') {
        changeTheme('light');
    } else changeTheme('dark');
};

document.getElementById('console-entries').onchange = (e) =>
    changeNumberInput(e.target, 'consoleEntries', [0, 200]);

document.getElementById('font-size').onchange = (e) => {
    changeNumberInput(e.target, 'fontSize', [5, 100]);
    updateFontSize();
};

function updateFontSize() {
    require(['vs/editor/editor.main'], function() {
        window.editor.updateOptions({
            fontSize: localStorage.getItem('fontSize'),
        });
    });
}

function changeNumberInput(target, storageName, bounds) {
    let value = target.value;
    if (value < bounds[0]) value = bounds[0];
    else if (value > bounds[1]) value = bounds[1];
    target.value = value;
    localStorage.setItem(storageName, parseInt(value));
    if (storageName == 'consoleEntries') {
        window.maxConsoleEntries = parseInt(value);
    }
}

function setDefaults() {
    if (localStorage.getItem('firstTime') != null) return;
    localStorage.setItem('firstTime', false);
    localStorage.setItem('theme', 'light');
    localStorage.setItem('consoleEntries', 100);
    localStorage.setItem('fontSize', 14);
    localStorage.setItem('settingsSize', 48);
    localStorage.setItem('leftSize', 33);
    localStorage.setItem('rightSize', 33);
    localStorage.setItem('consoleSize', 48);
    localStorage.setItem('layout', '{}');
    localStorage.setItem('main-file', "");
    localStorage.setItem(
        'main.rgn',
        `
import generators.animal as animal
import generators.flower as flower

fun main() {
    // two image generators created with Regina
    // animal.main()
    flower.main()
}`,
    );
}
// comment

function openSettings() {
    document.getElementById('console-entries').value =
        localStorage.getItem('consoleEntries');
    window.maxConsoleEntries = parseInt(localStorage.getItem('consoleEntries'));
    document.getElementById('font-size').value =
        localStorage.getItem('fontSize');
    document.getElementById("main-file").value =  localStorage.getItem("main-file")
    updateFontSize();
}

function changeTheme(themeName) {
    require(['vs/editor/editor.main'], function() {
        localStorage.setItem('theme', themeName);
        monaco.editor.setTheme('regina-' + themeName);
        document.documentElement.setAttribute('data-theme', themeName);
        document.getElementById('theme-button').innerText = themeName;
    });
}

setDefaults();
changeTheme(localStorage.getItem('theme'));
openSettings();

createTree();
