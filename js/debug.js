import { createLeaf, createParent } from "./filetree.js";
import { switchTab } from "./tab.js";
import { hideLeftPanel } from "./index.js";

var breakpointsList = [];
var currentBreakpointIndex = 0;

function addConsoleOutput(output) {
    if (breakpointsList.length != 0)
        breakpointsList[breakpointsList.length - 1].output.push(output);
}

function removeConsoleOutput(number) {
    let records = document
        .getElementById("console")
        .getElementsByClassName("console-record");
    for (let i = 0; i < number; i++) {
        records.removeChild(records.lastElementChild);
    }
}

function nextBreakpoint() {
    if (currentBreakpointIndex < breakpointsList.length - 1) {
        unhighlightBreakpointLine(
            parseInt(
                breakpointsList[currentBreakpointIndex].scope["@position"]
                    .second_1
            ) + 1
        );
        showDebuggingScope(breakpointsList[++currentBreakpointIndex].scope);
        changeCurrentIndex();
    }
}

function previousBreakpoint() {
    if (currentBreakpointIndex > 0) {
        unhighlightBreakpointLine(
            parseInt(
                breakpointsList[currentBreakpointIndex].scope["@position"]
                    .second_1
            ) + 1
        );
        showDebuggingScope(breakpointsList[--currentBreakpointIndex].scope);
        changeCurrentIndex();
    }
}

function toCaretBreakpoint() {
    let lineNumber = window.editor.getPosition().lineNumber;
    let i = 0;
    for (let breakpoint of breakpointsList.slice(
        currentBreakpointIndex,
        breakpointsList.length
    )) {
        if (lineNumber == breakpoint.scope["@position"].second_1 + 1) {
            unhighlightBreakpointLine(
                parseInt(
                    breakpointsList[currentBreakpointIndex].scope["@position"]
                        .second_1
                ) + 1
            );
            currentBreakpointIndex += i;
            changeCurrentIndex();
            showDebuggingScope(breakpointsList[currentBreakpointIndex].scope);
            return;
        }
        i++;
    }
    let notificiation = document.createElement("span");
    notificiation.innerText = "No further breakpoint on same line with a caret";
    notificiation.style.color = "var(--gray)";
    document
        .getElementById("debug-button-panel")
        .insertAdjacentElement("afterend", notificiation);
}

function changeCurrentIndex() {
    document
        .getElementById("debug-button-panel")
        .getElementsByTagName("span")[0].innerText =
        currentBreakpointIndex + 1 + "/" + breakpointsList.length;
}

function addBreakpoint(point) {
    breakpointsList.push({ output: [], scope: traverseMap(point) });
}

function traverseMap(map) {
    // non-map
    if (typeof map != "object") return map;
    if (isLinkedHashMap(map)) map = transformLinkedHashMap(map);
    // normal map
    for (const [key, value] of Object.entries(map)) {
        map[key] = traverseMap(value);
    }
    return map;
}

function isLinkedHashMap(map) {
    return (
        map.equality_1 != null &&
        map.map_1 != null &&
        map.isReadOnly_1 != null &&
        map.internalMap_1 != null
    );
}

function transformLinkedHashMap(map) {
    let res = {};
    let entry = map.head_1;
    if (entry == null) return res;
    let firstObject = null;
    let index = 0;
    while (res[entry.key_1] == null && entry.key_1 != firstObject) {
        if (typeof entry.key_1 == "object") {
            if (firstObject == null) firstObject = entry.key_1;
            res["@entry_" + index] = {};
            res["@entry_" + index].key = entry.key_1;
            res["@entry_" + index].value = entry._value_1;
            index++;
        } else res[entry.key_1] = entry._value_1;
        entry = entry.next_1;
    }
    return res;
}

function startDebugging() {
    if (breakpointsList.length == 0) return;
    currentBreakpointIndex = 0;
    if (
        document.getElementsByClassName("container-left")[0].style.display ==
        "none"
    ) {
        console.log("clicked")
        hideLeftPanel();
    }
    changeCurrentIndex();
    showDebuggingScope(breakpointsList[currentBreakpointIndex].scope);
}

function showDebuggingScope(scope) {
    let breakpointTab = window.tabs[scope["@file"]];
    if (breakpointTab != window.currentTab) switchTab(breakpointTab);
    let debugPanel = document.getElementById("debug-panel");
    let buttons = document.getElementById("debug-button-panel");
    debugPanel.innerHTML = "";
    debugPanel.appendChild(buttons);
    let settingsPanel = document.getElementById("settings-panel");
    debugPanel.style = "display:block;";
    settingsPanel.style = "display:none;";
    highlightBreakpointLine(parseInt(scope["@position"].second_1) + 1);
    let locals = Object.entries(scope);
    for (const [key, value] of locals) {
        if (key[0] == "@") continue;
        if (isCollection(value)) {
            createCollection(key, value.second_1, value.first_1, scope);
        } else {
            createNonCollection(key, value.second_1, value.first_1);
        }
    }
    if (locals.length == 2) {
        let noLocals = document.createElement("span");
        noLocals.innerText = "no local variables";
        noLocals.style.color = "var(--gray)";
        debugPanel.appendChild(noLocals);
    }
}

function createCollection(
    name,
    value,
    type,
    scope,
    parent = document.getElementById("debug-panel")
) {
    let parentText = createParent(parent);
    let ident = createIdentifier(parentText, name);
    let valueSpan = getValueSpan(value, type, scope);

    parentText.appendChild(valueSpan);
    parentText.setAttribute("cType", type);
    parentText.setAttribute("cValue", value);
    ident.insertAdjacentText("afterend", ": ");
    parentText.onclick = () => {
        if (parentText.getAttribute("added") != null) return;
        let tree = parentText.parentElement.getElementsByTagName("ul")[0];
        if (parentText.getAttribute("cType") == "Array")
            addChildrenToArray(tree, scope, parentText.getAttribute("cValue"));
        else if (parentText.getAttribute("cType") == "Dictionary")
            addChildrenToDictionary(
                tree,
                scope,
                parentText.getAttribute("cValue")
            );
        else if (parentText.getAttribute("cType") == "Type")
            addChildrenToType(tree, scope, parentText.getAttribute("cValue"));
    };
}

function getValueSpan(value, type, scope, isSimple) {
    let simpleSpan = isSimple ? document.createElement("span") : null;
    switch (type) {
        case "Dictionary":
            if (isSimple) {
                if (Object.entries(getDictionary(value, scope)).length == 0)
                    simpleSpan.innerText = "{}";
                else simpleSpan.innerText = "{..}";
                return simpleSpan;
            }
            return getDictionarySpan(value, scope);
        case "Array":
            if (isSimple) {
                if (getArray(value, scope).length == 0)
                    simpleSpan.innerText = "[]";
                else simpleSpan.innerText = "[..]";
                return simpleSpan;
            }
            return getArraySpan(value, scope);
        default:
            return createSimpleSpan(value, type);
    }
}

function addChildrenToArray(arrayElement, scope, id) {
    let arrayChildren = getArray(id, scope);
    let i = 0;
    for (const child of arrayChildren) {
        if (isCollection(child))
            createCollection(
                i,
                child.second_1,
                child.first_1,
                scope,
                arrayElement
            );
        else
            createNonCollection(i, child.second_1, child.first_1, arrayElement);
        i++;
    }
    arrayElement.setAttribute("added", "true");
}

function treeFromCaret(caret) {
    return caret.parentElement.getElementsByTagName("ul")[0];
}

function addChildrenToDictionary(dictElement, scope, id) {
    let dictChildren = getDictionary(id, scope);
    for (const [_, keyVal] of Object.entries(dictChildren)) {
        let entryElement = createParent(dictElement);
        entryElement.appendChild(
            getValueSpan(keyVal.key.second_1, keyVal.key.first_1, scope, true)
        );
        entryElement.insertAdjacentText("beforeend", ": ");
        entryElement.appendChild(
            getValueSpan(
                keyVal.value.second_1,
                keyVal.value.first_1,
                scope,
                true
            )
        );
        let tree = treeFromCaret(entryElement);
        if (isCollection(keyVal.key))
            createCollection(
                "key",
                keyVal.key.second_1,
                keyVal.key.first_1,
                scope,
                tree
            );
        else
            createNonCollection(
                "key",
                keyVal.key.second_1,
                keyVal.key.first_1,
                tree
            );
        if (isCollection(keyVal.value))
            createCollection(
                "value",
                keyVal.value.second_1,
                keyVal.value.first_1,
                scope,
                tree
            );
        else
            createNonCollection(
                "value",
                keyVal.value.second_1,
                keyVal.value.first_1,
                tree
            );
    }
    dictElement.setAttribute("added", "true");
}

function addChildrenToType(typeElement, scope, id) {
    let typeChildren = getType(id, scope);
    for (const [ident, property] of Object.entries(typeChildren)) {
        let tree = treeFromCaret(typeElement);
        if (isCollection(property))
            createCollection(
                ident,
                property.second_1,
                property.first_1,
                scope,
                tree
            );
        else
            createNonCollection(
                ident,
                property.second_1,
                property.first_1,
                tree
            );
    }
    typeElement.setAttribute("added", "true");
}

function getType(id, scope) {
    return scope["@references"].types_1[id].properties_1;
}

function getArray(id, scope) {
    return scope["@references"].arrays_1[id].properties_1.array_1;
}

function getDictionary(id, scope) {
    return scope["@references"].dictionaries_1[id].properties_1;
}

function getDictionarySpan(id, scope) {
    let res = document.createElement("span");
    res.innerText = "{";
    let entries = Object.entries(getDictionary(id, scope));
    for (const [_, entry] of entries.slice(0, 3)) {
        let key = entry.key;
        let value = entry.value;
        let keySpan = getValueSpan(key.second_1, key.first_1, scope, true);
        let valueSpan = getValueSpan(
            value.second_1,
            value.first_1,
            scope,
            true
        );
        res.appendChild(keySpan);
        keySpan.insertAdjacentText("afterend", ":");
        res.appendChild(valueSpan);
        valueSpan.insertAdjacentText("afterend", ", ");
    }
    res.insertAdjacentText("beforeend", entries.length > 3 ? "..}" : "}");
    if (entries.length <= 3 && entries.length != 0)
        res.removeChild(res.childNodes[res.childNodes.length - 2]);
    return res;
}

function getArraySpan(id, scope) {
    let res = document.createElement("span");
    res.innerText = "[";
    let elements = getArray(id, scope);
    for (const value of elements.slice(0, 5)) {
        let valueSpan = getValueSpan(
            value.second_1,
            value.first_1,
            scope,
            true
        );
        res.appendChild(valueSpan);
        valueSpan.insertAdjacentText("afterend", ", ");
    }
    res.insertAdjacentText("beforeend", elements.length > 5 ? "..]" : "]");
    if (elements.length <= 5 && elements.length != 0)
        res.removeChild(res.childNodes[res.childNodes.length - 2]);
    return res;
}

function createSimpleSpan(value, type) {
    let res = document.createElement("span");
    res.textContent = type == "String" ? '"' + value + '"' : value;
    if (type != "Type")
        res.style.color =
            type == "String" ? "var(--string-color)" : "var(--number-color)";
    return res;
}

function createNonCollection(
    name,
    value,
    type,
    parent = document.getElementById("debug-panel")
) {
    let parentText = createLeaf(parent);
    parentText.style.marginLeft = "-40px";
    let ident = createIdentifier(parentText, name);
    createValue(parentText, value, type);
    ident.insertAdjacentText("afterend", ": ");
}

function createValue(parent, value, type) {
    let valueSpan = document.createElement("span");
    valueSpan.textContent = type == "String" ? '"' + value + '" ' : value + " ";
    valueSpan.style.color =
        type == "String" ? "var(--string-color)" : "var(--number-color)";
    parent.appendChild(valueSpan);
}

function createIdentifier(parent, name) {
    let nameSpan = document.createElement("span");
    nameSpan.textContent = name;
    nameSpan.style.color = "var(--ident-color)";
    parent.appendChild(nameSpan);
    return nameSpan;
}

function isCollection(e) {
    return (
        e.first_1 == "Type" || e.first_1 == "Array" || e.first_1 == "Dictionary"
    );
}

function highlightBreakpointLine(lineNumber) {
    let breakpoints = window.editor.getBreakpoints();
    for (let i = 0; i < breakpoints.length; i++) {
        if (breakpoints[i].range.startLineNumber == lineNumber) {
            breakpoints[i].options.className = "highlight-breakpoint-line";
            break;
        }
    }
    window.editor.setBreakpoints(breakpoints);
    window.editor.setPosition({ lineNumber: lineNumber, column: 1 });
    window.editor.revealLine(lineNumber);
}

function unhighlightBreakpointLine(lineNumber) {
    let breakpoints = window.editor.getBreakpoints();
    for (let i = 0; i < breakpoints.length; i++) {
        if (breakpoints[i].range.startLineNumber == lineNumber) {
            breakpoints[i].options.className = "";
            break;
        }
    }
    window.editor.setBreakpoints(breakpoints);
    window.editor.setPosition({ lineNumber: lineNumber, column: 1 });
    window.editor.revealLine(lineNumber);
}

function changeBreakpointColor(lineNumber) {
    let breakpoints = window.editor.getBreakpoints();
    if (lineNumber == null) {
        breakpointsList = [];
        breakpoints.forEach((point) => {
            point.options.glyphMarginClassName =
                "fas fa-ban inactive-breakpoint";
        });
    } else
        breakpoints.forEach((point) => {
            if (point.range.startLineNumber == lineNumber) {
                point.options.glyphMarginClassName = "fas fa-circle";
            }
        });
    window.editor.setBreakpoints(breakpoints);
}

function getBreakpointsList() {
    return breakpointsList;
}

function getBreakpointsIndex() {
    return currentBreakpointIndex;
}

function setBreakpointsList(list) {
    breakpointsList = list;
}

function setBreakpointsIndex(ind) {
    currentBreakpointIndex = ind;
}

export default {};
export {
    changeBreakpointColor,
    addBreakpoint,
    startDebugging,
    nextBreakpoint,
    previousBreakpoint,
    toCaretBreakpoint,
    addConsoleOutput,
    getBreakpointsList,
    getBreakpointsIndex,
    setBreakpointsList,
    setBreakpointsIndex,
};
