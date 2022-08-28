import { createFolder, createLeaf, createParent } from "./filetree.js";

var breakpointsList = [];
var currentBreakpointIndex = 0;

function changeBreakpointColor(lineNumber) {
    let breakpoints = window.editor.getBreakpoints()
    if (lineNumber == null) {
        breakpointsList = [];
        breakpoints.forEach(point => {
            point.options.glyphMarginClassName = "fas fa-ban inactive-breakpoint"
        })
    } else
        breakpoints.forEach(point => {
            if (point.range.startLineNumber == lineNumber) {
                point.options.glyphMarginClassName = "fas fa-circle"
            }
        })
    window.editor.setBreakpoints(breakpoints)
}

function addBreakpoint(point) {
    console.log(point)
    breakpointsList.push(traverseMap(point));
}

function traverseMap(map) {
    // non-map
    if (typeof map != 'object')
        return map
    if (isLinkedHashMap(map))
        map = transformLinkedHashMap(map)
        // normal map
    for (const [key, value] of Object.entries(map)) {
        map[key] = traverseMap(value)
    }
    return map
}

function isLinkedHashMap(map) {
    return map.equality_1 != null &&
        map.map_1 != null &&
        map.isReadOnly_1 != null &&
        map.internalMap_1 != null
}

function transformLinkedHashMap(map) {
    let res = {}
    let entry = map.head_1
    if (entry == null)
        return res
    let firstObject = null
    let index = 0
    while (res[entry.key_1] == null && entry.key_1 != firstObject) {
        if (typeof entry.key_1 == 'object') {
            if (firstObject == null)
                firstObject = entry.key_1
            res["@entry_" + index] = {}
            res["@entry_" + index].key = entry.key_1
            res["@entry_" + index].value = entry._value_1
            index++
        } else
            res[entry.key_1] = entry._value_1
        entry = entry.next_1
    }
    return res
}

function startDebugging() {
    if (breakpointsList.length == 0)
        return
    let debugPanel = document.getElementById("debug-panel");
    let settingsPanel = document.getElementById("settings-panel");
    debugPanel.style = "display:block;";
    settingsPanel.style = "display:none;";
    showDebuggingScope(breakpointsList[currentBreakpointIndex]);
}

function showDebuggingScope(scope) {
    console.log(scope)
    highlightBreakpointLine(parseInt(scope["@position"].second_1) + 1)
    for (const [key, value] of Object.entries(scope)) {
        if (key[0] == "@")
            continue
        if (isCollection(value)) {
            createCollection(key, value.second_1, value.first_1, scope)
        } else { createNonCollection(key, value.second_1, value.first_1) }
    }
    // empty debug panel
    // create all elements
}

function createCollection(name, value, type, scope, parent = document.getElementById("debug-panel")) {
    let parentText = createParent(parent)

    let ident = createIdentifier(parentText, name)

    let valueSpan;
    valueSpan = getValueSpan(value, type, scope)
    let i = 0;
    // for (let child of valueSpan.getElementsByTagName("span")) {
    //     let inParentSpan = document.createElement("ul");
    //     inParentSpan.style.marginLeft = '-60px'
    //     let ident = createIdentifier(inParentSpan, i)
    //     parentText.parentElement.getElementsByTagName("ul")[0].appendChild(inParentSpan)
    //     inParentSpan.appendChild(ident)
    //     ident.insertAdjacentText('afterend', ": ")
    //     inParentSpan.appendChild(child.cloneNode(true))
    //     i++;
    // }

    parentText.appendChild(valueSpan)
    parentText.setAttribute("cType", type)
    parentText.setAttribute("cValue", value)
    ident.insertAdjacentText('afterend', ": ")
    parentText.onclick = (e) => {
        if (parentText.getAttribute("added") != null)
            return
        let tree = parentText.parentElement.getElementsByTagName("ul")[0]
        if (parentText.getAttribute("cType") == 'Array')
            addChildrenToArray(tree, scope, parentText.getAttribute("cValue"))
        else if (parentText.getAttribute("cType") == 'Dictionary')
            addChildrenToDictionary(tree, scope, parentText.getAttribute("cValue"))
        else if (parentText.getAttribute("cType") == 'Type')
            addChildrenToType(tree, scope, parentText.getAttribute("cValue"))
    }
}

function getValueSpan(value, type, scope, isSimple) {
    let simpleSpan = isSimple ? document.createElement("span") : null;
    switch (type) {
        case "Dictionary":
            if (isSimple) {
                simpleSpan.innerText = "{..}"
                return simpleSpan
            }
            return getDictionarySpan(value, scope);
        case "Array":
            if (isSimple) {
                simpleSpan.innerText = "[..]"
                return simpleSpan
            }
            return getArraySpan(value, scope);
        default:
            return createSimpleSpan(value, type)
    }
}

function addChildrenToArray(arrayElement, scope, id) {
    let arrayChildren = getArray(id, scope)
    let i = 0;
    for (const child of arrayChildren) {
        if (isCollection(child))
            createCollection(i, child.second_1, child.first_1, scope, arrayElement)
        else createNonCollection(i, child.second_1, child.first_1, arrayElement)
        i++
        // let childSpan = document.createElement("ul")
        // createIdentifier(childSpan, i)
        // let valueSpan = getValueSpan(child.second_1, child.first_1, scope, true)
        // childSpan.appendChild(valueSpan)
        // arrayElement.appendChild(childSpan)
    }
    arrayElement.parentElement.getElementsByClassName("caret")[0].setAttribute("added", "true")
}

function treeFromCaret(caret) {
    return caret.parentElement.getElementsByTagName("ul")[0]
}

function addChildrenToDictionary(dictElement, scope, id) {
    let dictChildren = getDictionary(id, scope)
    let i = 0;
    for (const [entry, keyVal] of Object.entries(dictChildren)) {
        let entryElement = createParent(dictElement);
        createIdentifier(entryElement, 'entry' + i) //'entry'+i)
        let tree = treeFromCaret(entryElement)
        if (isCollection(keyVal.key))
            createCollection('key', keyVal.key.second_1, keyVal.key.first_1, scope, tree)
        else createNonCollection('key', keyVal.key.second_1, keyVal.key.first_1, tree)
        if (isCollection(keyVal.value))
            createCollection('value', keyVal.value.second_1, keyVal.value.first_1, scope, tree)
        else createNonCollection('value', keyVal.value.second_1, keyVal.value.first_1, tree)
        i++
    }
    dictElement.parentElement.getElementsByClassName("caret")[0].setAttribute("added", "true")
}

function addChildrenToType(typeElement, scope, id) {
    let typeChildren = getType(id, scope)
    let i = 0;
    for (const [ident, property] of Object.entries(typeChildren)) {
        let tree = treeFromCaret(typeElement)
        if (isCollection(property))
            createCollection(ident, property.second_1, property.first_1, scope, tree)
        else createNonCollection(ident, property.second_1, property.first_1, tree)
        i++
    }
    typeElement.parentElement.getElementsByClassName("caret")[0].setAttribute("added", "true")
}

function getType(id, scope) {
    return scope["@references"].types_1[id].properties_1
}

function getArray(id, scope) {
    return scope["@references"].arrays_1[id].properties_1.array_1
}

function getDictionary(id, scope) {
    return scope["@references"].dictionaries_1[id].properties_1
}

function getDictionarySpan(id, scope) {
    let res = document.createElement("span");
    res.innerText = "{"
    let entries = Object.entries(getDictionary(id, scope))
    for (const [_, entry] of entries.slice(0, 3)) {
        let key = entry.key;
        let value = entry.value;
        let keySpan = getValueSpan(key.second_1, key.first_1, scope, true)
        let valueSpan = getValueSpan(value.second_1, value.first_1, scope, true)
        res.appendChild(keySpan)
        keySpan.insertAdjacentText('afterend', ":")
        res.appendChild(valueSpan)
        valueSpan.insertAdjacentText('afterend', ", ")
    }
    res.insertAdjacentText('beforeend', entries.length > 3 ? "..}" : "}")
    if (entries.length <= 3 && entries.length != 0)
        res.removeChild(res.childNodes[res.childNodes.length - 2])
    return res;
}

function getArraySpan(id, scope) {
    let res = document.createElement("span");
    res.innerText = "["
    let elements = getArray(id, scope)
    for (const value of elements.slice(0, 5)) {
        let valueSpan = getValueSpan(value.second_1, value.first_1, scope, true)
        res.appendChild(valueSpan)
        valueSpan.insertAdjacentText('afterend', ", ")
    }
    res.insertAdjacentText('beforeend', elements.length > 5 ? "..]" : "]")
    if (elements.length <= 5 && elements.length != 0)
        res.removeChild(res.childNodes[res.childNodes.length - 2])
    return res;
}

function createSimpleSpan(value, type) {
    let res = document.createElement("span")
    res.textContent = type == 'String' ? '"' + value + '"' : value
    if (type != 'Type')
        res.style.color = (type == 'String' ? "var(--string-color)" : "var(--number-color)")
    return res;
}

function createNonCollection(name, value, type, parent = document.getElementById("debug-panel")) {
    let parentText = createLeaf(parent);
    parentText.style.marginLeft = '-40px'
    let ident = createIdentifier(parentText, name)
    createValue(parentText, value, type)
    ident.insertAdjacentText('afterend', ": ")
}

function createValue(parent, value, type) {
    let valueSpan = document.createElement("span")
    valueSpan.textContent = type == 'String' ? '"' + value + '" ' : value + ' '
    valueSpan.style.color = (type == 'String' ? "var(--string-color)" : "var(--number-color)")
    parent.appendChild(valueSpan)
}

function createIdentifier(parent, name) {
    let nameSpan = document.createElement("span")
    nameSpan.textContent = name
    nameSpan.style.color = "var(--ident-color)"
    parent.appendChild(nameSpan)
    return nameSpan
}

function getCollectionString(scope, collection) {
    switch (collection.first_1) {
        case "Type":
            return collection.second_1
        case "Array":
            return getArrayById(collection.second_1, scope["@references"].arrays_1)
        case "Dictionary":
            return getDictionaryById(collection.second_1, scope["@references"].dictionaries_1)
    }
}

function isCollection(e) {
    return e.first_1 == 'Type' || e.first_1 == 'Array' || e.first_1 == 'Dictionary'
}

function getArrayById(id, arrays) {
    let array = arrays[id].properties_1.array_1
    return "[" + array.slice(0, 4).map(e => shortenedString(e)).join(', ') +
        (array.length > 4 ? ",..]" : "]");
}

function shortenedString(e) {
    return typeof e == 'object' ? shortenedCollectionString(e) : e
}

function shortenedCollectionString(collection) {
    switch (collection.first_1) {
        case "Type":
            return collection.second_1
        case "Array":
            return "[..]"
        case "Dictionary":
            return "{..}"
    }
}

function getDictionaryById(id, dictionaries) {
    let dict = dictionaries[id].properties_1
    return "{" + Object.entries(dict).slice(0, 3).map(([key, value], i) => {
        if (key[0] == "@") {
            return shortenedString(dict[key].key) + ":" + shortenedString(dict[key].value)
        }
        return key + ":" + shortenedString(value)
    }).join(', ') + (Object.keys(dict).length > 2 ? ",..}" : "}");
}

function highlightBreakpointLine(lineNumber) {
    let breakpoints = window.editor.getBreakpoints()
    for (let i = 0; i < breakpoints.length; i++) {
        if (breakpoints[i].range.startLineNumber == lineNumber) {
            breakpoints[i].options.className = "highlight-breakpoint-line";
            break;
        }

    }
    window.editor.setBreakpoints(breakpoints)
    window.editor.setPosition({ lineNumber: lineNumber, column: 1 });
    window.editor.revealLine(lineNumber);
}

function loadDebuggingFold(foldElement, scope, elementId) {}

export default {};
export { changeBreakpointColor, addBreakpoint, startDebugging }