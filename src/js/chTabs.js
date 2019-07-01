window.$ = require('jquery');
window.ChromeTabs = require('../../awr-modules/chrome-tabs');

let el = document.querySelector('.chrome-tabs');
let chromeTabs = new ChromeTabs();

chromeTabs.init(el);

el.addEventListener('activeTabChange', ({detail}) => {
    // console.log('Active tab changed', detail.tabEl);

    let isImg = detail.tabEl.querySelector('.fa-picture-o');
    if (isImg != null) {
        document.querySelector('#save-img').classList.add('visible');
    } else {
        document.querySelector('#save-img').classList.remove('visible');
    }

    if (document.getElementsByClassName('chrome-tabs-content')[0].children.length > 1) {
        visibleOff();
    }
    visibleOn(detail.tabEl.getAttribute('index'));
});
el.addEventListener('tabAdd', ({detail}) => {
    // console.log('Tab added', detail.tabEl);

    detail.tabEl.setAttribute('index', getNextIndexAttr());
});
el.addEventListener('tabRemove', ({detail}) => {
    // console.log('Tab removed', detail.tabEl);

    const indx = detail.tabEl.getAttribute('index');
    let el = document.querySelector(`webview[index="${indx}"]`);
    el.remove();
});

function openChromeTab(url, props = {}, opt = {}) {
    let tab = chromeTabs.addTab(props, opt);
    let webview = initWebview(url);

    return {tab: tab, webview: webview};
}

function initWebview(url) {
    visibleOff();
    let webview = document.createElement('webview');
    let tabs = document.getElementsByClassName('etabs-views')[0];
    tabs.appendChild(webview);

    webview.classList.add('visible');
    webview.classList.add('etabs-view');
    webview.setAttribute('src', url);
    webview.setAttribute('plugins', 'on');
    webview.setAttribute('nodeintegration', 'true');
    webview.setAttribute('index', getNextIndexAttr());

    return webview;
}

function visibleOff() {
    let tabs = document.getElementsByClassName('etabs-views')[0];
    for (let item of tabs.children) {
        item.classList.remove('visible');
    }
}

function visibleOn(index) {
    let tabs = document.getElementsByClassName('etabs-views')[0];
    for (let item of tabs.children) {
        if (index == 1) {
            item.classList.add('visible');
            break;
        } else if (item.getAttribute('index') == index) {
            item.classList.add('visible');
            break;
        }
    }
}

function removeTab(domObj = {}) {
    if (domObj.tab) {
        chromeTabs.removeTab(chromeTabs.activeTabEl);
    }
    if (domObj.webview) {
        domObj.webview.remove();
    }
}

function getActiveTab() {
    const indx = chromeTabs.activeTabEl.getAttribute('index');
    let webview = document.querySelector(`webview[index="${indx}"]`);

    return {tab: chromeTabs.activeTabEl, webview: webview};
}

function removeActiveTab() {
    const indx = chromeTabs.activeTabEl.getAttribute('index');
    let web = document.querySelector(`webview[index="${indx}"]`);
    removeTab({tab: chromeTabs.activeTabEl, webview: web});
}

function getNextIndexAttr() {
    let chContent = document.getElementsByClassName('chrome-tabs-content')[0];
    let indx = chContent.children.length || 1;
    if (indx > 2) {
        let length = chContent.children.length - 2;
        indx = chContent.children[length].getAttribute('index');
        indx++;
    }

    return indx.toString();
}