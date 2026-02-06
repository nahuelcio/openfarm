var hQ = Object.create;
var {
  getPrototypeOf: aQ,
  defineProperty: MQ,
  getOwnPropertyNames: nQ,
} = Object;
var oQ = Object.prototype.hasOwnProperty;
var FQ = (_, u, c) => {
  c = _ != null ? hQ(aQ(_)) : {};
  let n =
    u || !_ || !_.__esModule
      ? MQ(c, "default", { value: _, enumerable: !0 })
      : c;
  for (let M of nQ(_))
    if (!oQ.call(n, M)) MQ(n, M, { get: () => _[M], enumerable: !0 });
  return n;
};
var PQ = (_, u) => () => (u || _((u = { exports: {} }).exports, u), u.exports);
var gQ = PQ((UQ, kQ) => {
  (function (_, u) {
    if (typeof UQ == "object" && typeof kQ == "object") kQ.exports = u();
    else if (typeof define == "function" && define.amd) define([], u);
    else {
      var c = u();
      for (var n in c) (typeof UQ == "object" ? UQ : _)[n] = c[n];
    }
  })(self, () =>
    (() => {
      var _ = {
          4567: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (Y, F, j, $) {
                  var E,
                    U = arguments.length,
                    z =
                      U < 3
                        ? F
                        : $ === null
                          ? ($ = Object.getOwnPropertyDescriptor(F, j))
                          : $;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    z = Reflect.decorate(Y, F, j, $);
                  else
                    for (var k = Y.length - 1; k >= 0; k--)
                      (E = Y[k]) &&
                        (z =
                          (U < 3 ? E(z) : U > 3 ? E(F, j, z) : E(F, j)) || z);
                  return U > 3 && z && Object.defineProperty(F, j, z), z;
                },
              V =
                (this && this.__param) ||
                function (Y, F) {
                  return function (j, $) {
                    F(j, $, Y);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.AccessibilityManager = void 0);
            let q = K(9042),
              J = K(6114),
              N = K(9924),
              X = K(844),
              G = K(5596),
              Q = K(4725),
              W = K(3656),
              Z = (H.AccessibilityManager = class extends X.Disposable {
                constructor(Y, F) {
                  super(),
                    (this._terminal = Y),
                    (this._renderService = F),
                    (this._liveRegionLineCount = 0),
                    (this._charsToConsume = []),
                    (this._charsToAnnounce = ""),
                    (this._accessibilityContainer =
                      document.createElement("div")),
                    this._accessibilityContainer.classList.add(
                      "xterm-accessibility"
                    ),
                    (this._rowContainer = document.createElement("div")),
                    this._rowContainer.setAttribute("role", "list"),
                    this._rowContainer.classList.add(
                      "xterm-accessibility-tree"
                    ),
                    (this._rowElements = []);
                  for (let j = 0; j < this._terminal.rows; j++)
                    (this._rowElements[j] =
                      this._createAccessibilityTreeNode()),
                      this._rowContainer.appendChild(this._rowElements[j]);
                  if (
                    ((this._topBoundaryFocusListener = (j) =>
                      this._handleBoundaryFocus(j, 0)),
                    (this._bottomBoundaryFocusListener = (j) =>
                      this._handleBoundaryFocus(j, 1)),
                    this._rowElements[0].addEventListener(
                      "focus",
                      this._topBoundaryFocusListener
                    ),
                    this._rowElements[
                      this._rowElements.length - 1
                    ].addEventListener(
                      "focus",
                      this._bottomBoundaryFocusListener
                    ),
                    this._refreshRowsDimensions(),
                    this._accessibilityContainer.appendChild(
                      this._rowContainer
                    ),
                    (this._liveRegion = document.createElement("div")),
                    this._liveRegion.classList.add("live-region"),
                    this._liveRegion.setAttribute("aria-live", "assertive"),
                    this._accessibilityContainer.appendChild(this._liveRegion),
                    (this._liveRegionDebouncer = this.register(
                      new N.TimeBasedDebouncer(this._renderRows.bind(this))
                    )),
                    !this._terminal.element)
                  )
                    throw Error(
                      "Cannot enable accessibility before Terminal.open"
                    );
                  this._terminal.element.insertAdjacentElement(
                    "afterbegin",
                    this._accessibilityContainer
                  ),
                    this.register(
                      this._terminal.onResize((j) => this._handleResize(j.rows))
                    ),
                    this.register(
                      this._terminal.onRender((j) =>
                        this._refreshRows(j.start, j.end)
                      )
                    ),
                    this.register(
                      this._terminal.onScroll(() => this._refreshRows())
                    ),
                    this.register(
                      this._terminal.onA11yChar((j) => this._handleChar(j))
                    ),
                    this.register(
                      this._terminal.onLineFeed(() =>
                        this._handleChar(`
`)
                      )
                    ),
                    this.register(
                      this._terminal.onA11yTab((j) => this._handleTab(j))
                    ),
                    this.register(
                      this._terminal.onKey((j) => this._handleKey(j.key))
                    ),
                    this.register(
                      this._terminal.onBlur(() => this._clearLiveRegion())
                    ),
                    this.register(
                      this._renderService.onDimensionsChange(() =>
                        this._refreshRowsDimensions()
                      )
                    ),
                    (this._screenDprMonitor = new G.ScreenDprMonitor(window)),
                    this.register(this._screenDprMonitor),
                    this._screenDprMonitor.setListener(() =>
                      this._refreshRowsDimensions()
                    ),
                    this.register(
                      (0, W.addDisposableDomListener)(window, "resize", () =>
                        this._refreshRowsDimensions()
                      )
                    ),
                    this._refreshRows(),
                    this.register(
                      (0, X.toDisposable)(() => {
                        this._accessibilityContainer.remove(),
                          (this._rowElements.length = 0);
                      })
                    );
                }
                _handleTab(Y) {
                  for (let F = 0; F < Y; F++) this._handleChar(" ");
                }
                _handleChar(Y) {
                  this._liveRegionLineCount < 21 &&
                    (this._charsToConsume.length > 0
                      ? this._charsToConsume.shift() !== Y &&
                        (this._charsToAnnounce += Y)
                      : (this._charsToAnnounce += Y),
                    Y ===
                      `
` &&
                      (this._liveRegionLineCount++,
                      this._liveRegionLineCount === 21 &&
                        (this._liveRegion.textContent += q.tooMuchOutput)),
                    J.isMac &&
                      this._liveRegion.textContent &&
                      this._liveRegion.textContent.length > 0 &&
                      !this._liveRegion.parentNode &&
                      setTimeout(() => {
                        this._accessibilityContainer.appendChild(
                          this._liveRegion
                        );
                      }, 0));
                }
                _clearLiveRegion() {
                  (this._liveRegion.textContent = ""),
                    (this._liveRegionLineCount = 0),
                    J.isMac && this._liveRegion.remove();
                }
                _handleKey(Y) {
                  this._clearLiveRegion(),
                    /\p{Control}/u.test(Y) || this._charsToConsume.push(Y);
                }
                _refreshRows(Y, F) {
                  this._liveRegionDebouncer.refresh(Y, F, this._terminal.rows);
                }
                _renderRows(Y, F) {
                  let j = this._terminal.buffer,
                    $ = j.lines.length.toString();
                  for (let E = Y; E <= F; E++) {
                    let U = j.translateBufferLineToString(j.ydisp + E, !0),
                      z = (j.ydisp + E + 1).toString(),
                      k = this._rowElements[E];
                    k &&
                      (U.length === 0
                        ? (k.innerText = " ")
                        : (k.textContent = U),
                      k.setAttribute("aria-posinset", z),
                      k.setAttribute("aria-setsize", $));
                  }
                  this._announceCharacters();
                }
                _announceCharacters() {
                  this._charsToAnnounce.length !== 0 &&
                    ((this._liveRegion.textContent += this._charsToAnnounce),
                    (this._charsToAnnounce = ""));
                }
                _handleBoundaryFocus(Y, F) {
                  let j = Y.target,
                    $ =
                      this._rowElements[
                        F === 0 ? 1 : this._rowElements.length - 2
                      ];
                  if (
                    j.getAttribute("aria-posinset") ===
                    (F === 0 ? "1" : `${this._terminal.buffer.lines.length}`)
                  )
                    return;
                  if (Y.relatedTarget !== $) return;
                  let E, U;
                  if (
                    (F === 0
                      ? ((E = j),
                        (U = this._rowElements.pop()),
                        this._rowContainer.removeChild(U))
                      : ((E = this._rowElements.shift()),
                        (U = j),
                        this._rowContainer.removeChild(E)),
                    E.removeEventListener(
                      "focus",
                      this._topBoundaryFocusListener
                    ),
                    U.removeEventListener(
                      "focus",
                      this._bottomBoundaryFocusListener
                    ),
                    F === 0)
                  ) {
                    let z = this._createAccessibilityTreeNode();
                    this._rowElements.unshift(z),
                      this._rowContainer.insertAdjacentElement("afterbegin", z);
                  } else {
                    let z = this._createAccessibilityTreeNode();
                    this._rowElements.push(z),
                      this._rowContainer.appendChild(z);
                  }
                  this._rowElements[0].addEventListener(
                    "focus",
                    this._topBoundaryFocusListener
                  ),
                    this._rowElements[
                      this._rowElements.length - 1
                    ].addEventListener(
                      "focus",
                      this._bottomBoundaryFocusListener
                    ),
                    this._terminal.scrollLines(F === 0 ? -1 : 1),
                    this._rowElements[
                      F === 0 ? 1 : this._rowElements.length - 2
                    ].focus(),
                    Y.preventDefault(),
                    Y.stopImmediatePropagation();
                }
                _handleResize(Y) {
                  this._rowElements[
                    this._rowElements.length - 1
                  ].removeEventListener(
                    "focus",
                    this._bottomBoundaryFocusListener
                  );
                  for (
                    let F = this._rowContainer.children.length;
                    F < this._terminal.rows;
                    F++
                  )
                    (this._rowElements[F] =
                      this._createAccessibilityTreeNode()),
                      this._rowContainer.appendChild(this._rowElements[F]);
                  for (; this._rowElements.length > Y; )
                    this._rowContainer.removeChild(this._rowElements.pop());
                  this._rowElements[
                    this._rowElements.length - 1
                  ].addEventListener(
                    "focus",
                    this._bottomBoundaryFocusListener
                  ),
                    this._refreshRowsDimensions();
                }
                _createAccessibilityTreeNode() {
                  let Y = document.createElement("div");
                  return (
                    Y.setAttribute("role", "listitem"),
                    (Y.tabIndex = -1),
                    this._refreshRowDimensions(Y),
                    Y
                  );
                }
                _refreshRowsDimensions() {
                  if (this._renderService.dimensions.css.cell.height) {
                    (this._accessibilityContainer.style.width = `${this._renderService.dimensions.css.canvas.width}px`),
                      this._rowElements.length !== this._terminal.rows &&
                        this._handleResize(this._terminal.rows);
                    for (let Y = 0; Y < this._terminal.rows; Y++)
                      this._refreshRowDimensions(this._rowElements[Y]);
                  }
                }
                _refreshRowDimensions(Y) {
                  Y.style.height = `${this._renderService.dimensions.css.cell.height}px`;
                }
              });
            H.AccessibilityManager = Z = P([V(1, Q.IRenderService)], Z);
          },
          3614: (M, H) => {
            function K(J) {
              return J.replace(/\r?\n/g, "\r");
            }
            function P(J, N) {
              return N ? "\x1B[200~" + J + "\x1B[201~" : J;
            }
            function V(J, N, X, G) {
              (J = P(
                (J = K(J)),
                X.decPrivateModes.bracketedPasteMode &&
                  G.rawOptions.ignoreBracketedPasteMode !== !0
              )),
                X.triggerDataEvent(J, !0),
                (N.value = "");
            }
            function q(J, N, X) {
              let G = X.getBoundingClientRect(),
                Q = J.clientX - G.left - 10,
                W = J.clientY - G.top - 10;
              (N.style.width = "20px"),
                (N.style.height = "20px"),
                (N.style.left = `${Q}px`),
                (N.style.top = `${W}px`),
                (N.style.zIndex = "1000"),
                N.focus();
            }
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.rightClickHandler =
                H.moveTextAreaUnderMouseCursor =
                H.paste =
                H.handlePasteEvent =
                H.copyHandler =
                H.bracketTextForPaste =
                H.prepareTextForTerminal =
                  void 0),
              (H.prepareTextForTerminal = K),
              (H.bracketTextForPaste = P),
              (H.copyHandler = function (J, N) {
                J.clipboardData &&
                  J.clipboardData.setData("text/plain", N.selectionText),
                  J.preventDefault();
              }),
              (H.handlePasteEvent = function (J, N, X, G) {
                J.stopPropagation(),
                  J.clipboardData &&
                    V(J.clipboardData.getData("text/plain"), N, X, G);
              }),
              (H.paste = V),
              (H.moveTextAreaUnderMouseCursor = q),
              (H.rightClickHandler = function (J, N, X, G, Q) {
                q(J, N, X),
                  Q && G.rightClickSelect(J),
                  (N.value = G.selectionText),
                  N.select();
              });
          },
          7239: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.ColorContrastCache = void 0);
            let P = K(1505);
            H.ColorContrastCache = class {
              constructor() {
                (this._color = new P.TwoKeyMap()),
                  (this._css = new P.TwoKeyMap());
              }
              setCss(V, q, J) {
                this._css.set(V, q, J);
              }
              getCss(V, q) {
                return this._css.get(V, q);
              }
              setColor(V, q, J) {
                this._color.set(V, q, J);
              }
              getColor(V, q) {
                return this._color.get(V, q);
              }
              clear() {
                this._color.clear(), this._css.clear();
              }
            };
          },
          3656: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.addDisposableDomListener = void 0),
              (H.addDisposableDomListener = function (K, P, V, q) {
                K.addEventListener(P, V, q);
                let J = !1;
                return {
                  dispose: () => {
                    J || ((J = !0), K.removeEventListener(P, V, q));
                  },
                };
              });
          },
          6465: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (Q, W, Z, Y) {
                  var F,
                    j = arguments.length,
                    $ =
                      j < 3
                        ? W
                        : Y === null
                          ? (Y = Object.getOwnPropertyDescriptor(W, Z))
                          : Y;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    $ = Reflect.decorate(Q, W, Z, Y);
                  else
                    for (var E = Q.length - 1; E >= 0; E--)
                      (F = Q[E]) &&
                        ($ =
                          (j < 3 ? F($) : j > 3 ? F(W, Z, $) : F(W, Z)) || $);
                  return j > 3 && $ && Object.defineProperty(W, Z, $), $;
                },
              V =
                (this && this.__param) ||
                function (Q, W) {
                  return function (Z, Y) {
                    W(Z, Y, Q);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.Linkifier2 = void 0);
            let q = K(3656),
              J = K(8460),
              N = K(844),
              X = K(2585),
              G = (H.Linkifier2 = class extends N.Disposable {
                get currentLink() {
                  return this._currentLink;
                }
                constructor(Q) {
                  super(),
                    (this._bufferService = Q),
                    (this._linkProviders = []),
                    (this._linkCacheDisposables = []),
                    (this._isMouseOut = !0),
                    (this._wasResized = !1),
                    (this._activeLine = -1),
                    (this._onShowLinkUnderline = this.register(
                      new J.EventEmitter()
                    )),
                    (this.onShowLinkUnderline =
                      this._onShowLinkUnderline.event),
                    (this._onHideLinkUnderline = this.register(
                      new J.EventEmitter()
                    )),
                    (this.onHideLinkUnderline =
                      this._onHideLinkUnderline.event),
                    this.register(
                      (0, N.getDisposeArrayDisposable)(
                        this._linkCacheDisposables
                      )
                    ),
                    this.register(
                      (0, N.toDisposable)(() => {
                        this._lastMouseEvent = void 0;
                      })
                    ),
                    this.register(
                      this._bufferService.onResize(() => {
                        this._clearCurrentLink(), (this._wasResized = !0);
                      })
                    );
                }
                registerLinkProvider(Q) {
                  return (
                    this._linkProviders.push(Q),
                    {
                      dispose: () => {
                        let W = this._linkProviders.indexOf(Q);
                        W !== -1 && this._linkProviders.splice(W, 1);
                      },
                    }
                  );
                }
                attachToDom(Q, W, Z) {
                  (this._element = Q),
                    (this._mouseService = W),
                    (this._renderService = Z),
                    this.register(
                      (0, q.addDisposableDomListener)(
                        this._element,
                        "mouseleave",
                        () => {
                          (this._isMouseOut = !0), this._clearCurrentLink();
                        }
                      )
                    ),
                    this.register(
                      (0, q.addDisposableDomListener)(
                        this._element,
                        "mousemove",
                        this._handleMouseMove.bind(this)
                      )
                    ),
                    this.register(
                      (0, q.addDisposableDomListener)(
                        this._element,
                        "mousedown",
                        this._handleMouseDown.bind(this)
                      )
                    ),
                    this.register(
                      (0, q.addDisposableDomListener)(
                        this._element,
                        "mouseup",
                        this._handleMouseUp.bind(this)
                      )
                    );
                }
                _handleMouseMove(Q) {
                  if (
                    ((this._lastMouseEvent = Q),
                    !this._element || !this._mouseService)
                  )
                    return;
                  let W = this._positionFromMouseEvent(
                    Q,
                    this._element,
                    this._mouseService
                  );
                  if (!W) return;
                  this._isMouseOut = !1;
                  let Z = Q.composedPath();
                  for (let Y = 0; Y < Z.length; Y++) {
                    let F = Z[Y];
                    if (F.classList.contains("xterm")) break;
                    if (F.classList.contains("xterm-hover")) return;
                  }
                  (this._lastBufferCell &&
                    W.x === this._lastBufferCell.x &&
                    W.y === this._lastBufferCell.y) ||
                    (this._handleHover(W), (this._lastBufferCell = W));
                }
                _handleHover(Q) {
                  if (this._activeLine !== Q.y || this._wasResized)
                    return (
                      this._clearCurrentLink(),
                      this._askForLink(Q, !1),
                      void (this._wasResized = !1)
                    );
                  (this._currentLink &&
                    this._linkAtPosition(this._currentLink.link, Q)) ||
                    (this._clearCurrentLink(), this._askForLink(Q, !0));
                }
                _askForLink(Q, W) {
                  var Z, Y;
                  (this._activeProviderReplies && W) ||
                    ((Z = this._activeProviderReplies) === null ||
                      Z === void 0 ||
                      Z.forEach((j) => {
                        j == null ||
                          j.forEach(($) => {
                            $.link.dispose && $.link.dispose();
                          });
                      }),
                    (this._activeProviderReplies = new Map()),
                    (this._activeLine = Q.y));
                  let F = !1;
                  for (let [j, $] of this._linkProviders.entries())
                    W
                      ? ((Y = this._activeProviderReplies) === null ||
                        Y === void 0
                          ? void 0
                          : Y.get(j)) &&
                        (F = this._checkLinkProviderResult(j, Q, F))
                      : $.provideLinks(Q.y, (E) => {
                          var U, z;
                          if (this._isMouseOut) return;
                          let k =
                            E == null ? void 0 : E.map((O) => ({ link: O }));
                          (U = this._activeProviderReplies) === null ||
                            U === void 0 ||
                            U.set(j, k),
                            (F = this._checkLinkProviderResult(j, Q, F)),
                            ((z = this._activeProviderReplies) === null ||
                            z === void 0
                              ? void 0
                              : z.size) === this._linkProviders.length &&
                              this._removeIntersectingLinks(
                                Q.y,
                                this._activeProviderReplies
                              );
                        });
                }
                _removeIntersectingLinks(Q, W) {
                  let Z = new Set();
                  for (let Y = 0; Y < W.size; Y++) {
                    let F = W.get(Y);
                    if (F)
                      for (let j = 0; j < F.length; j++) {
                        let $ = F[j],
                          E =
                            $.link.range.start.y < Q ? 0 : $.link.range.start.x,
                          U =
                            $.link.range.end.y > Q
                              ? this._bufferService.cols
                              : $.link.range.end.x;
                        for (let z = E; z <= U; z++) {
                          if (Z.has(z)) {
                            F.splice(j--, 1);
                            break;
                          }
                          Z.add(z);
                        }
                      }
                  }
                }
                _checkLinkProviderResult(Q, W, Z) {
                  var Y;
                  if (!this._activeProviderReplies) return Z;
                  let F = this._activeProviderReplies.get(Q),
                    j = !1;
                  for (let $ = 0; $ < Q; $++)
                    (this._activeProviderReplies.has($) &&
                      !this._activeProviderReplies.get($)) ||
                      (j = !0);
                  if (!j && F) {
                    let $ = F.find((E) => this._linkAtPosition(E.link, W));
                    $ && ((Z = !0), this._handleNewLink($));
                  }
                  if (
                    this._activeProviderReplies.size ===
                      this._linkProviders.length &&
                    !Z
                  )
                    for (let $ = 0; $ < this._activeProviderReplies.size; $++) {
                      let E =
                        (Y = this._activeProviderReplies.get($)) === null ||
                        Y === void 0
                          ? void 0
                          : Y.find((U) => this._linkAtPosition(U.link, W));
                      if (E) {
                        (Z = !0), this._handleNewLink(E);
                        break;
                      }
                    }
                  return Z;
                }
                _handleMouseDown() {
                  this._mouseDownLink = this._currentLink;
                }
                _handleMouseUp(Q) {
                  if (
                    !this._element ||
                    !this._mouseService ||
                    !this._currentLink
                  )
                    return;
                  let W = this._positionFromMouseEvent(
                    Q,
                    this._element,
                    this._mouseService
                  );
                  W &&
                    this._mouseDownLink === this._currentLink &&
                    this._linkAtPosition(this._currentLink.link, W) &&
                    this._currentLink.link.activate(
                      Q,
                      this._currentLink.link.text
                    );
                }
                _clearCurrentLink(Q, W) {
                  this._element &&
                    this._currentLink &&
                    this._lastMouseEvent &&
                    (!Q ||
                      !W ||
                      (this._currentLink.link.range.start.y >= Q &&
                        this._currentLink.link.range.end.y <= W)) &&
                    (this._linkLeave(
                      this._element,
                      this._currentLink.link,
                      this._lastMouseEvent
                    ),
                    (this._currentLink = void 0),
                    (0, N.disposeArray)(this._linkCacheDisposables));
                }
                _handleNewLink(Q) {
                  if (
                    !this._element ||
                    !this._lastMouseEvent ||
                    !this._mouseService
                  )
                    return;
                  let W = this._positionFromMouseEvent(
                    this._lastMouseEvent,
                    this._element,
                    this._mouseService
                  );
                  W &&
                    this._linkAtPosition(Q.link, W) &&
                    ((this._currentLink = Q),
                    (this._currentLink.state = {
                      decorations: {
                        underline:
                          Q.link.decorations === void 0 ||
                          Q.link.decorations.underline,
                        pointerCursor:
                          Q.link.decorations === void 0 ||
                          Q.link.decorations.pointerCursor,
                      },
                      isHovered: !0,
                    }),
                    this._linkHover(
                      this._element,
                      Q.link,
                      this._lastMouseEvent
                    ),
                    (Q.link.decorations = {}),
                    Object.defineProperties(Q.link.decorations, {
                      pointerCursor: {
                        get: () => {
                          var Z, Y;
                          return (Y =
                            (Z = this._currentLink) === null || Z === void 0
                              ? void 0
                              : Z.state) === null || Y === void 0
                            ? void 0
                            : Y.decorations.pointerCursor;
                        },
                        set: (Z) => {
                          var Y, F;
                          ((Y = this._currentLink) === null || Y === void 0
                            ? void 0
                            : Y.state) &&
                            this._currentLink.state.decorations
                              .pointerCursor !== Z &&
                            ((this._currentLink.state.decorations.pointerCursor =
                              Z),
                            this._currentLink.state.isHovered &&
                              ((F = this._element) === null ||
                                F === void 0 ||
                                F.classList.toggle("xterm-cursor-pointer", Z)));
                        },
                      },
                      underline: {
                        get: () => {
                          var Z, Y;
                          return (Y =
                            (Z = this._currentLink) === null || Z === void 0
                              ? void 0
                              : Z.state) === null || Y === void 0
                            ? void 0
                            : Y.decorations.underline;
                        },
                        set: (Z) => {
                          var Y, F, j;
                          ((Y = this._currentLink) === null || Y === void 0
                            ? void 0
                            : Y.state) &&
                            ((j =
                              (F = this._currentLink) === null || F === void 0
                                ? void 0
                                : F.state) === null || j === void 0
                              ? void 0
                              : j.decorations.underline) !== Z &&
                            ((this._currentLink.state.decorations.underline =
                              Z),
                            this._currentLink.state.isHovered &&
                              this._fireUnderlineEvent(Q.link, Z));
                        },
                      },
                    }),
                    this._renderService &&
                      this._linkCacheDisposables.push(
                        this._renderService.onRenderedViewportChange((Z) => {
                          if (!this._currentLink) return;
                          let Y =
                              Z.start === 0
                                ? 0
                                : Z.start +
                                  1 +
                                  this._bufferService.buffer.ydisp,
                            F = this._bufferService.buffer.ydisp + 1 + Z.end;
                          if (
                            this._currentLink.link.range.start.y >= Y &&
                            this._currentLink.link.range.end.y <= F &&
                            (this._clearCurrentLink(Y, F),
                            this._lastMouseEvent && this._element)
                          ) {
                            let j = this._positionFromMouseEvent(
                              this._lastMouseEvent,
                              this._element,
                              this._mouseService
                            );
                            j && this._askForLink(j, !1);
                          }
                        })
                      ));
                }
                _linkHover(Q, W, Z) {
                  var Y;
                  ((Y = this._currentLink) === null || Y === void 0
                    ? void 0
                    : Y.state) &&
                    ((this._currentLink.state.isHovered = !0),
                    this._currentLink.state.decorations.underline &&
                      this._fireUnderlineEvent(W, !0),
                    this._currentLink.state.decorations.pointerCursor &&
                      Q.classList.add("xterm-cursor-pointer")),
                    W.hover && W.hover(Z, W.text);
                }
                _fireUnderlineEvent(Q, W) {
                  let Z = Q.range,
                    Y = this._bufferService.buffer.ydisp,
                    F = this._createLinkUnderlineEvent(
                      Z.start.x - 1,
                      Z.start.y - Y - 1,
                      Z.end.x,
                      Z.end.y - Y - 1,
                      void 0
                    );
                  (W
                    ? this._onShowLinkUnderline
                    : this._onHideLinkUnderline
                  ).fire(F);
                }
                _linkLeave(Q, W, Z) {
                  var Y;
                  ((Y = this._currentLink) === null || Y === void 0
                    ? void 0
                    : Y.state) &&
                    ((this._currentLink.state.isHovered = !1),
                    this._currentLink.state.decorations.underline &&
                      this._fireUnderlineEvent(W, !1),
                    this._currentLink.state.decorations.pointerCursor &&
                      Q.classList.remove("xterm-cursor-pointer")),
                    W.leave && W.leave(Z, W.text);
                }
                _linkAtPosition(Q, W) {
                  let Z =
                      Q.range.start.y * this._bufferService.cols +
                      Q.range.start.x,
                    Y =
                      Q.range.end.y * this._bufferService.cols + Q.range.end.x,
                    F = W.y * this._bufferService.cols + W.x;
                  return Z <= F && F <= Y;
                }
                _positionFromMouseEvent(Q, W, Z) {
                  let Y = Z.getCoords(
                    Q,
                    W,
                    this._bufferService.cols,
                    this._bufferService.rows
                  );
                  if (Y)
                    return {
                      x: Y[0],
                      y: Y[1] + this._bufferService.buffer.ydisp,
                    };
                }
                _createLinkUnderlineEvent(Q, W, Z, Y, F) {
                  return {
                    x1: Q,
                    y1: W,
                    x2: Z,
                    y2: Y,
                    cols: this._bufferService.cols,
                    fg: F,
                  };
                }
              });
            H.Linkifier2 = G = P([V(0, X.IBufferService)], G);
          },
          9042: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.tooMuchOutput = H.promptLabel = void 0),
              (H.promptLabel = "Terminal input"),
              (H.tooMuchOutput =
                "Too much output to announce, navigate to rows manually to read");
          },
          3730: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (G, Q, W, Z) {
                  var Y,
                    F = arguments.length,
                    j =
                      F < 3
                        ? Q
                        : Z === null
                          ? (Z = Object.getOwnPropertyDescriptor(Q, W))
                          : Z;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    j = Reflect.decorate(G, Q, W, Z);
                  else
                    for (var $ = G.length - 1; $ >= 0; $--)
                      (Y = G[$]) &&
                        (j =
                          (F < 3 ? Y(j) : F > 3 ? Y(Q, W, j) : Y(Q, W)) || j);
                  return F > 3 && j && Object.defineProperty(Q, W, j), j;
                },
              V =
                (this && this.__param) ||
                function (G, Q) {
                  return function (W, Z) {
                    Q(W, Z, G);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.OscLinkProvider = void 0);
            let q = K(511),
              J = K(2585),
              N = (H.OscLinkProvider = class {
                constructor(G, Q, W) {
                  (this._bufferService = G),
                    (this._optionsService = Q),
                    (this._oscLinkService = W);
                }
                provideLinks(G, Q) {
                  var W;
                  let Z = this._bufferService.buffer.lines.get(G - 1);
                  if (!Z) return void Q(void 0);
                  let Y = [],
                    F = this._optionsService.rawOptions.linkHandler,
                    j = new q.CellData(),
                    $ = Z.getTrimmedLength(),
                    E = -1,
                    U = -1,
                    z = !1;
                  for (let k = 0; k < $; k++)
                    if (U !== -1 || Z.hasContent(k)) {
                      if (
                        (Z.loadCell(k, j),
                        j.hasExtendedAttrs() && j.extended.urlId)
                      ) {
                        if (U === -1) {
                          (U = k), (E = j.extended.urlId);
                          continue;
                        }
                        z = j.extended.urlId !== E;
                      } else U !== -1 && (z = !0);
                      if (z || (U !== -1 && k === $ - 1)) {
                        let O =
                          (W = this._oscLinkService.getLinkData(E)) === null ||
                          W === void 0
                            ? void 0
                            : W.uri;
                        if (O) {
                          let L = {
                              start: { x: U + 1, y: G },
                              end: { x: k + (z || k !== $ - 1 ? 0 : 1), y: G },
                            },
                            b = !1;
                          if (!(F == null ? void 0 : F.allowNonHttpProtocols))
                            try {
                              let B = new URL(O);
                              ["http:", "https:"].includes(B.protocol) ||
                                (b = !0);
                            } catch (B) {
                              b = !0;
                            }
                          b ||
                            Y.push({
                              text: O,
                              range: L,
                              activate: (B, S) =>
                                F ? F.activate(B, S, L) : X(0, S),
                              hover: (B, S) => {
                                var I;
                                return (I = F == null ? void 0 : F.hover) ===
                                  null || I === void 0
                                  ? void 0
                                  : I.call(F, B, S, L);
                              },
                              leave: (B, S) => {
                                var I;
                                return (I = F == null ? void 0 : F.leave) ===
                                  null || I === void 0
                                  ? void 0
                                  : I.call(F, B, S, L);
                              },
                            });
                        }
                        (z = !1),
                          j.hasExtendedAttrs() && j.extended.urlId
                            ? ((U = k), (E = j.extended.urlId))
                            : ((U = -1), (E = -1));
                      }
                    }
                  Q(Y);
                }
              });
            function X(G, Q) {
              if (
                confirm(`Do you want to navigate to ${Q}?

WARNING: This link could potentially be dangerous`)
              ) {
                let W = window.open();
                if (W) {
                  try {
                    W.opener = null;
                  } catch (Z) {}
                  W.location.href = Q;
                } else
                  console.warn(
                    "Opening link blocked as opener could not be cleared"
                  );
              }
            }
            H.OscLinkProvider = N = P(
              [
                V(0, J.IBufferService),
                V(1, J.IOptionsService),
                V(2, J.IOscLinkService),
              ],
              N
            );
          },
          6193: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.RenderDebouncer = void 0),
              (H.RenderDebouncer = class {
                constructor(K, P) {
                  (this._parentWindow = K),
                    (this._renderCallback = P),
                    (this._refreshCallbacks = []);
                }
                dispose() {
                  this._animationFrame &&
                    (this._parentWindow.cancelAnimationFrame(
                      this._animationFrame
                    ),
                    (this._animationFrame = void 0));
                }
                addRefreshCallback(K) {
                  return (
                    this._refreshCallbacks.push(K),
                    this._animationFrame ||
                      (this._animationFrame =
                        this._parentWindow.requestAnimationFrame(() =>
                          this._innerRefresh()
                        )),
                    this._animationFrame
                  );
                }
                refresh(K, P, V) {
                  (this._rowCount = V),
                    (K = K !== void 0 ? K : 0),
                    (P = P !== void 0 ? P : this._rowCount - 1),
                    (this._rowStart =
                      this._rowStart !== void 0
                        ? Math.min(this._rowStart, K)
                        : K),
                    (this._rowEnd =
                      this._rowEnd !== void 0 ? Math.max(this._rowEnd, P) : P),
                    this._animationFrame ||
                      (this._animationFrame =
                        this._parentWindow.requestAnimationFrame(() =>
                          this._innerRefresh()
                        ));
                }
                _innerRefresh() {
                  if (
                    ((this._animationFrame = void 0),
                    this._rowStart === void 0 ||
                      this._rowEnd === void 0 ||
                      this._rowCount === void 0)
                  )
                    return void this._runRefreshCallbacks();
                  let K = Math.max(this._rowStart, 0),
                    P = Math.min(this._rowEnd, this._rowCount - 1);
                  (this._rowStart = void 0),
                    (this._rowEnd = void 0),
                    this._renderCallback(K, P),
                    this._runRefreshCallbacks();
                }
                _runRefreshCallbacks() {
                  for (let K of this._refreshCallbacks) K(0);
                  this._refreshCallbacks = [];
                }
              });
          },
          5596: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.ScreenDprMonitor = void 0);
            let P = K(844);
            class V extends P.Disposable {
              constructor(q) {
                super(),
                  (this._parentWindow = q),
                  (this._currentDevicePixelRatio =
                    this._parentWindow.devicePixelRatio),
                  this.register(
                    (0, P.toDisposable)(() => {
                      this.clearListener();
                    })
                  );
              }
              setListener(q) {
                this._listener && this.clearListener(),
                  (this._listener = q),
                  (this._outerListener = () => {
                    this._listener &&
                      (this._listener(
                        this._parentWindow.devicePixelRatio,
                        this._currentDevicePixelRatio
                      ),
                      this._updateDpr());
                  }),
                  this._updateDpr();
              }
              _updateDpr() {
                var q;
                this._outerListener &&
                  ((q = this._resolutionMediaMatchList) === null ||
                    q === void 0 ||
                    q.removeListener(this._outerListener),
                  (this._currentDevicePixelRatio =
                    this._parentWindow.devicePixelRatio),
                  (this._resolutionMediaMatchList =
                    this._parentWindow.matchMedia(
                      `screen and (resolution: ${this._parentWindow.devicePixelRatio}dppx)`
                    )),
                  this._resolutionMediaMatchList.addListener(
                    this._outerListener
                  ));
              }
              clearListener() {
                this._resolutionMediaMatchList &&
                  this._listener &&
                  this._outerListener &&
                  (this._resolutionMediaMatchList.removeListener(
                    this._outerListener
                  ),
                  (this._resolutionMediaMatchList = void 0),
                  (this._listener = void 0),
                  (this._outerListener = void 0));
              }
            }
            H.ScreenDprMonitor = V;
          },
          3236: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.Terminal = void 0);
            let P = K(3614),
              V = K(3656),
              q = K(6465),
              J = K(9042),
              N = K(3730),
              X = K(1680),
              G = K(3107),
              Q = K(5744),
              W = K(2950),
              Z = K(1296),
              Y = K(428),
              F = K(4269),
              j = K(5114),
              $ = K(8934),
              E = K(3230),
              U = K(9312),
              z = K(4725),
              k = K(6731),
              O = K(8055),
              L = K(8969),
              b = K(8460),
              B = K(844),
              S = K(6114),
              I = K(8437),
              R = K(2584),
              D = K(7399),
              y = K(5941),
              A = K(9074),
              v = K(2585),
              m = K(5435),
              p = K(4567),
              f = typeof window < "u" ? window.document : null;
            class d extends L.CoreTerminal {
              get onFocus() {
                return this._onFocus.event;
              }
              get onBlur() {
                return this._onBlur.event;
              }
              get onA11yChar() {
                return this._onA11yCharEmitter.event;
              }
              get onA11yTab() {
                return this._onA11yTabEmitter.event;
              }
              get onWillOpen() {
                return this._onWillOpen.event;
              }
              constructor(T = {}) {
                super(T),
                  (this.browser = S),
                  (this._keyDownHandled = !1),
                  (this._keyDownSeen = !1),
                  (this._keyPressHandled = !1),
                  (this._unprocessedDeadKey = !1),
                  (this._accessibilityManager = this.register(
                    new B.MutableDisposable()
                  )),
                  (this._onCursorMove = this.register(new b.EventEmitter())),
                  (this.onCursorMove = this._onCursorMove.event),
                  (this._onKey = this.register(new b.EventEmitter())),
                  (this.onKey = this._onKey.event),
                  (this._onRender = this.register(new b.EventEmitter())),
                  (this.onRender = this._onRender.event),
                  (this._onSelectionChange = this.register(
                    new b.EventEmitter()
                  )),
                  (this.onSelectionChange = this._onSelectionChange.event),
                  (this._onTitleChange = this.register(new b.EventEmitter())),
                  (this.onTitleChange = this._onTitleChange.event),
                  (this._onBell = this.register(new b.EventEmitter())),
                  (this.onBell = this._onBell.event),
                  (this._onFocus = this.register(new b.EventEmitter())),
                  (this._onBlur = this.register(new b.EventEmitter())),
                  (this._onA11yCharEmitter = this.register(
                    new b.EventEmitter()
                  )),
                  (this._onA11yTabEmitter = this.register(
                    new b.EventEmitter()
                  )),
                  (this._onWillOpen = this.register(new b.EventEmitter())),
                  this._setup(),
                  (this.linkifier2 = this.register(
                    this._instantiationService.createInstance(q.Linkifier2)
                  )),
                  this.linkifier2.registerLinkProvider(
                    this._instantiationService.createInstance(N.OscLinkProvider)
                  ),
                  (this._decorationService =
                    this._instantiationService.createInstance(
                      A.DecorationService
                    )),
                  this._instantiationService.setService(
                    v.IDecorationService,
                    this._decorationService
                  ),
                  this.register(
                    this._inputHandler.onRequestBell(() => this._onBell.fire())
                  ),
                  this.register(
                    this._inputHandler.onRequestRefreshRows((x, C) =>
                      this.refresh(x, C)
                    )
                  ),
                  this.register(
                    this._inputHandler.onRequestSendFocus(() =>
                      this._reportFocus()
                    )
                  ),
                  this.register(
                    this._inputHandler.onRequestReset(() => this.reset())
                  ),
                  this.register(
                    this._inputHandler.onRequestWindowsOptionsReport((x) =>
                      this._reportWindowsOptions(x)
                    )
                  ),
                  this.register(
                    this._inputHandler.onColor((x) => this._handleColorEvent(x))
                  ),
                  this.register(
                    (0, b.forwardEvent)(
                      this._inputHandler.onCursorMove,
                      this._onCursorMove
                    )
                  ),
                  this.register(
                    (0, b.forwardEvent)(
                      this._inputHandler.onTitleChange,
                      this._onTitleChange
                    )
                  ),
                  this.register(
                    (0, b.forwardEvent)(
                      this._inputHandler.onA11yChar,
                      this._onA11yCharEmitter
                    )
                  ),
                  this.register(
                    (0, b.forwardEvent)(
                      this._inputHandler.onA11yTab,
                      this._onA11yTabEmitter
                    )
                  ),
                  this.register(
                    this._bufferService.onResize((x) =>
                      this._afterResize(x.cols, x.rows)
                    )
                  ),
                  this.register(
                    (0, B.toDisposable)(() => {
                      var x, C;
                      (this._customKeyEventHandler = void 0),
                        (C =
                          (x = this.element) === null || x === void 0
                            ? void 0
                            : x.parentNode) === null ||
                          C === void 0 ||
                          C.removeChild(this.element);
                    })
                  );
              }
              _handleColorEvent(T) {
                if (this._themeService)
                  for (let x of T) {
                    let C,
                      g = "";
                    switch (x.index) {
                      case 256:
                        (C = "foreground"), (g = "10");
                        break;
                      case 257:
                        (C = "background"), (g = "11");
                        break;
                      case 258:
                        (C = "cursor"), (g = "12");
                        break;
                      default:
                        (C = "ansi"), (g = "4;" + x.index);
                    }
                    switch (x.type) {
                      case 0:
                        let a = O.color.toColorRGB(
                          C === "ansi"
                            ? this._themeService.colors.ansi[x.index]
                            : this._themeService.colors[C]
                        );
                        this.coreService.triggerDataEvent(
                          `${R.C0.ESC}]${g};${(0, y.toRgbString)(a)}${R.C1_ESCAPED.ST}`
                        );
                        break;
                      case 1:
                        if (C === "ansi")
                          this._themeService.modifyColors(
                            (w) =>
                              (w.ansi[x.index] = O.rgba.toColor(...x.color))
                          );
                        else {
                          let w = C;
                          this._themeService.modifyColors(
                            (r) => (r[w] = O.rgba.toColor(...x.color))
                          );
                        }
                        break;
                      case 2:
                        this._themeService.restoreColor(x.index);
                    }
                  }
              }
              _setup() {
                super._setup(), (this._customKeyEventHandler = void 0);
              }
              get buffer() {
                return this.buffers.active;
              }
              focus() {
                this.textarea && this.textarea.focus({ preventScroll: !0 });
              }
              _handleScreenReaderModeOptionChange(T) {
                T
                  ? !this._accessibilityManager.value &&
                    this._renderService &&
                    (this._accessibilityManager.value =
                      this._instantiationService.createInstance(
                        p.AccessibilityManager,
                        this
                      ))
                  : this._accessibilityManager.clear();
              }
              _handleTextAreaFocus(T) {
                this.coreService.decPrivateModes.sendFocus &&
                  this.coreService.triggerDataEvent(R.C0.ESC + "[I"),
                  this.updateCursorStyle(T),
                  this.element.classList.add("focus"),
                  this._showCursor(),
                  this._onFocus.fire();
              }
              blur() {
                var T;
                return (T = this.textarea) === null || T === void 0
                  ? void 0
                  : T.blur();
              }
              _handleTextAreaBlur() {
                (this.textarea.value = ""),
                  this.refresh(this.buffer.y, this.buffer.y),
                  this.coreService.decPrivateModes.sendFocus &&
                    this.coreService.triggerDataEvent(R.C0.ESC + "[O"),
                  this.element.classList.remove("focus"),
                  this._onBlur.fire();
              }
              _syncTextArea() {
                if (
                  !this.textarea ||
                  !this.buffer.isCursorInViewport ||
                  this._compositionHelper.isComposing ||
                  !this._renderService
                )
                  return;
                let T = this.buffer.ybase + this.buffer.y,
                  x = this.buffer.lines.get(T);
                if (!x) return;
                let C = Math.min(this.buffer.x, this.cols - 1),
                  g = this._renderService.dimensions.css.cell.height,
                  a = x.getWidth(C),
                  w = this._renderService.dimensions.css.cell.width * a,
                  r =
                    this.buffer.y *
                    this._renderService.dimensions.css.cell.height,
                  h = C * this._renderService.dimensions.css.cell.width;
                (this.textarea.style.left = h + "px"),
                  (this.textarea.style.top = r + "px"),
                  (this.textarea.style.width = w + "px"),
                  (this.textarea.style.height = g + "px"),
                  (this.textarea.style.lineHeight = g + "px"),
                  (this.textarea.style.zIndex = "-5");
              }
              _initGlobal() {
                this._bindKeys(),
                  this.register(
                    (0, V.addDisposableDomListener)(
                      this.element,
                      "copy",
                      (x) => {
                        this.hasSelection() &&
                          (0, P.copyHandler)(x, this._selectionService);
                      }
                    )
                  );
                let T = (x) =>
                  (0, P.handlePasteEvent)(
                    x,
                    this.textarea,
                    this.coreService,
                    this.optionsService
                  );
                this.register(
                  (0, V.addDisposableDomListener)(this.textarea, "paste", T)
                ),
                  this.register(
                    (0, V.addDisposableDomListener)(this.element, "paste", T)
                  ),
                  S.isFirefox
                    ? this.register(
                        (0, V.addDisposableDomListener)(
                          this.element,
                          "mousedown",
                          (x) => {
                            x.button === 2 &&
                              (0, P.rightClickHandler)(
                                x,
                                this.textarea,
                                this.screenElement,
                                this._selectionService,
                                this.options.rightClickSelectsWord
                              );
                          }
                        )
                      )
                    : this.register(
                        (0, V.addDisposableDomListener)(
                          this.element,
                          "contextmenu",
                          (x) => {
                            (0, P.rightClickHandler)(
                              x,
                              this.textarea,
                              this.screenElement,
                              this._selectionService,
                              this.options.rightClickSelectsWord
                            );
                          }
                        )
                      ),
                  S.isLinux &&
                    this.register(
                      (0, V.addDisposableDomListener)(
                        this.element,
                        "auxclick",
                        (x) => {
                          x.button === 1 &&
                            (0, P.moveTextAreaUnderMouseCursor)(
                              x,
                              this.textarea,
                              this.screenElement
                            );
                        }
                      )
                    );
              }
              _bindKeys() {
                this.register(
                  (0, V.addDisposableDomListener)(
                    this.textarea,
                    "keyup",
                    (T) => this._keyUp(T),
                    !0
                  )
                ),
                  this.register(
                    (0, V.addDisposableDomListener)(
                      this.textarea,
                      "keydown",
                      (T) => this._keyDown(T),
                      !0
                    )
                  ),
                  this.register(
                    (0, V.addDisposableDomListener)(
                      this.textarea,
                      "keypress",
                      (T) => this._keyPress(T),
                      !0
                    )
                  ),
                  this.register(
                    (0, V.addDisposableDomListener)(
                      this.textarea,
                      "compositionstart",
                      () => this._compositionHelper.compositionstart()
                    )
                  ),
                  this.register(
                    (0, V.addDisposableDomListener)(
                      this.textarea,
                      "compositionupdate",
                      (T) => this._compositionHelper.compositionupdate(T)
                    )
                  ),
                  this.register(
                    (0, V.addDisposableDomListener)(
                      this.textarea,
                      "compositionend",
                      () => this._compositionHelper.compositionend()
                    )
                  ),
                  this.register(
                    (0, V.addDisposableDomListener)(
                      this.textarea,
                      "input",
                      (T) => this._inputEvent(T),
                      !0
                    )
                  ),
                  this.register(
                    this.onRender(() =>
                      this._compositionHelper.updateCompositionElements()
                    )
                  );
              }
              open(T) {
                var x;
                if (!T) throw Error("Terminal requires a parent element.");
                T.isConnected ||
                  this._logService.debug(
                    "Terminal.open was called on an element that was not attached to the DOM"
                  ),
                  (this._document = T.ownerDocument),
                  (this.element = this._document.createElement("div")),
                  (this.element.dir = "ltr"),
                  this.element.classList.add("terminal"),
                  this.element.classList.add("xterm"),
                  T.appendChild(this.element);
                let C = f.createDocumentFragment();
                (this._viewportElement = f.createElement("div")),
                  this._viewportElement.classList.add("xterm-viewport"),
                  C.appendChild(this._viewportElement),
                  (this._viewportScrollArea = f.createElement("div")),
                  this._viewportScrollArea.classList.add("xterm-scroll-area"),
                  this._viewportElement.appendChild(this._viewportScrollArea),
                  (this.screenElement = f.createElement("div")),
                  this.screenElement.classList.add("xterm-screen"),
                  (this._helperContainer = f.createElement("div")),
                  this._helperContainer.classList.add("xterm-helpers"),
                  this.screenElement.appendChild(this._helperContainer),
                  C.appendChild(this.screenElement),
                  (this.textarea = f.createElement("textarea")),
                  this.textarea.classList.add("xterm-helper-textarea"),
                  this.textarea.setAttribute("aria-label", J.promptLabel),
                  S.isChromeOS ||
                    this.textarea.setAttribute("aria-multiline", "false"),
                  this.textarea.setAttribute("autocorrect", "off"),
                  this.textarea.setAttribute("autocapitalize", "off"),
                  this.textarea.setAttribute("spellcheck", "false"),
                  (this.textarea.tabIndex = 0),
                  (this._coreBrowserService =
                    this._instantiationService.createInstance(
                      j.CoreBrowserService,
                      this.textarea,
                      (x = this._document.defaultView) !== null && x !== void 0
                        ? x
                        : window
                    )),
                  this._instantiationService.setService(
                    z.ICoreBrowserService,
                    this._coreBrowserService
                  ),
                  this.register(
                    (0, V.addDisposableDomListener)(
                      this.textarea,
                      "focus",
                      (g) => this._handleTextAreaFocus(g)
                    )
                  ),
                  this.register(
                    (0, V.addDisposableDomListener)(this.textarea, "blur", () =>
                      this._handleTextAreaBlur()
                    )
                  ),
                  this._helperContainer.appendChild(this.textarea),
                  (this._charSizeService =
                    this._instantiationService.createInstance(
                      Y.CharSizeService,
                      this._document,
                      this._helperContainer
                    )),
                  this._instantiationService.setService(
                    z.ICharSizeService,
                    this._charSizeService
                  ),
                  (this._themeService =
                    this._instantiationService.createInstance(k.ThemeService)),
                  this._instantiationService.setService(
                    z.IThemeService,
                    this._themeService
                  ),
                  (this._characterJoinerService =
                    this._instantiationService.createInstance(
                      F.CharacterJoinerService
                    )),
                  this._instantiationService.setService(
                    z.ICharacterJoinerService,
                    this._characterJoinerService
                  ),
                  (this._renderService = this.register(
                    this._instantiationService.createInstance(
                      E.RenderService,
                      this.rows,
                      this.screenElement
                    )
                  )),
                  this._instantiationService.setService(
                    z.IRenderService,
                    this._renderService
                  ),
                  this.register(
                    this._renderService.onRenderedViewportChange((g) =>
                      this._onRender.fire(g)
                    )
                  ),
                  this.onResize((g) =>
                    this._renderService.resize(g.cols, g.rows)
                  ),
                  (this._compositionView = f.createElement("div")),
                  this._compositionView.classList.add("composition-view"),
                  (this._compositionHelper =
                    this._instantiationService.createInstance(
                      W.CompositionHelper,
                      this.textarea,
                      this._compositionView
                    )),
                  this._helperContainer.appendChild(this._compositionView),
                  this.element.appendChild(C);
                try {
                  this._onWillOpen.fire(this.element);
                } catch (g) {}
                this._renderService.hasRenderer() ||
                  this._renderService.setRenderer(this._createRenderer()),
                  (this._mouseService =
                    this._instantiationService.createInstance($.MouseService)),
                  this._instantiationService.setService(
                    z.IMouseService,
                    this._mouseService
                  ),
                  (this.viewport = this._instantiationService.createInstance(
                    X.Viewport,
                    this._viewportElement,
                    this._viewportScrollArea
                  )),
                  this.viewport.onRequestScrollLines((g) =>
                    this.scrollLines(g.amount, g.suppressScrollEvent, 1)
                  ),
                  this.register(
                    this._inputHandler.onRequestSyncScrollBar(() =>
                      this.viewport.syncScrollArea()
                    )
                  ),
                  this.register(this.viewport),
                  this.register(
                    this.onCursorMove(() => {
                      this._renderService.handleCursorMove(),
                        this._syncTextArea();
                    })
                  ),
                  this.register(
                    this.onResize(() =>
                      this._renderService.handleResize(this.cols, this.rows)
                    )
                  ),
                  this.register(
                    this.onBlur(() => this._renderService.handleBlur())
                  ),
                  this.register(
                    this.onFocus(() => this._renderService.handleFocus())
                  ),
                  this.register(
                    this._renderService.onDimensionsChange(() =>
                      this.viewport.syncScrollArea()
                    )
                  ),
                  (this._selectionService = this.register(
                    this._instantiationService.createInstance(
                      U.SelectionService,
                      this.element,
                      this.screenElement,
                      this.linkifier2
                    )
                  )),
                  this._instantiationService.setService(
                    z.ISelectionService,
                    this._selectionService
                  ),
                  this.register(
                    this._selectionService.onRequestScrollLines((g) =>
                      this.scrollLines(g.amount, g.suppressScrollEvent)
                    )
                  ),
                  this.register(
                    this._selectionService.onSelectionChange(() =>
                      this._onSelectionChange.fire()
                    )
                  ),
                  this.register(
                    this._selectionService.onRequestRedraw((g) =>
                      this._renderService.handleSelectionChanged(
                        g.start,
                        g.end,
                        g.columnSelectMode
                      )
                    )
                  ),
                  this.register(
                    this._selectionService.onLinuxMouseSelection((g) => {
                      (this.textarea.value = g),
                        this.textarea.focus(),
                        this.textarea.select();
                    })
                  ),
                  this.register(
                    this._onScroll.event((g) => {
                      this.viewport.syncScrollArea(),
                        this._selectionService.refresh();
                    })
                  ),
                  this.register(
                    (0, V.addDisposableDomListener)(
                      this._viewportElement,
                      "scroll",
                      () => this._selectionService.refresh()
                    )
                  ),
                  this.linkifier2.attachToDom(
                    this.screenElement,
                    this._mouseService,
                    this._renderService
                  ),
                  this.register(
                    this._instantiationService.createInstance(
                      G.BufferDecorationRenderer,
                      this.screenElement
                    )
                  ),
                  this.register(
                    (0, V.addDisposableDomListener)(
                      this.element,
                      "mousedown",
                      (g) => this._selectionService.handleMouseDown(g)
                    )
                  ),
                  this.coreMouseService.areMouseEventsActive
                    ? (this._selectionService.disable(),
                      this.element.classList.add("enable-mouse-events"))
                    : this._selectionService.enable(),
                  this.options.screenReaderMode &&
                    (this._accessibilityManager.value =
                      this._instantiationService.createInstance(
                        p.AccessibilityManager,
                        this
                      )),
                  this.register(
                    this.optionsService.onSpecificOptionChange(
                      "screenReaderMode",
                      (g) => this._handleScreenReaderModeOptionChange(g)
                    )
                  ),
                  this.options.overviewRulerWidth &&
                    (this._overviewRulerRenderer = this.register(
                      this._instantiationService.createInstance(
                        Q.OverviewRulerRenderer,
                        this._viewportElement,
                        this.screenElement
                      )
                    )),
                  this.optionsService.onSpecificOptionChange(
                    "overviewRulerWidth",
                    (g) => {
                      !this._overviewRulerRenderer &&
                        g &&
                        this._viewportElement &&
                        this.screenElement &&
                        (this._overviewRulerRenderer = this.register(
                          this._instantiationService.createInstance(
                            Q.OverviewRulerRenderer,
                            this._viewportElement,
                            this.screenElement
                          )
                        ));
                    }
                  ),
                  this._charSizeService.measure(),
                  this.refresh(0, this.rows - 1),
                  this._initGlobal(),
                  this.bindMouse();
              }
              _createRenderer() {
                return this._instantiationService.createInstance(
                  Z.DomRenderer,
                  this.element,
                  this.screenElement,
                  this._viewportElement,
                  this.linkifier2
                );
              }
              bindMouse() {
                let T = this,
                  x = this.element;
                function C(w) {
                  let r = T._mouseService.getMouseReportCoords(
                    w,
                    T.screenElement
                  );
                  if (!r) return !1;
                  let h, s;
                  switch (w.overrideType || w.type) {
                    case "mousemove":
                      (s = 32),
                        w.buttons === void 0
                          ? ((h = 3),
                            w.button !== void 0 &&
                              (h = w.button < 3 ? w.button : 3))
                          : (h =
                              1 & w.buttons
                                ? 0
                                : 4 & w.buttons
                                  ? 1
                                  : 2 & w.buttons
                                    ? 2
                                    : 3);
                      break;
                    case "mouseup":
                      (s = 0), (h = w.button < 3 ? w.button : 3);
                      break;
                    case "mousedown":
                      (s = 1), (h = w.button < 3 ? w.button : 3);
                      break;
                    case "wheel":
                      if (T.viewport.getLinesScrolled(w) === 0) return !1;
                      (s = w.deltaY < 0 ? 0 : 1), (h = 4);
                      break;
                    default:
                      return !1;
                  }
                  return (
                    !(s === void 0 || h === void 0 || h > 4) &&
                    T.coreMouseService.triggerMouseEvent({
                      col: r.col,
                      row: r.row,
                      x: r.x,
                      y: r.y,
                      button: h,
                      action: s,
                      ctrl: w.ctrlKey,
                      alt: w.altKey,
                      shift: w.shiftKey,
                    })
                  );
                }
                let g = {
                    mouseup: null,
                    wheel: null,
                    mousedrag: null,
                    mousemove: null,
                  },
                  a = {
                    mouseup: (w) => (
                      C(w),
                      w.buttons ||
                        (this._document.removeEventListener(
                          "mouseup",
                          g.mouseup
                        ),
                        g.mousedrag &&
                          this._document.removeEventListener(
                            "mousemove",
                            g.mousedrag
                          )),
                      this.cancel(w)
                    ),
                    wheel: (w) => (C(w), this.cancel(w, !0)),
                    mousedrag: (w) => {
                      w.buttons && C(w);
                    },
                    mousemove: (w) => {
                      w.buttons || C(w);
                    },
                  };
                this.register(
                  this.coreMouseService.onProtocolChange((w) => {
                    w
                      ? (this.optionsService.rawOptions.logLevel === "debug" &&
                          this._logService.debug(
                            "Binding to mouse events:",
                            this.coreMouseService.explainEvents(w)
                          ),
                        this.element.classList.add("enable-mouse-events"),
                        this._selectionService.disable())
                      : (this._logService.debug("Unbinding from mouse events."),
                        this.element.classList.remove("enable-mouse-events"),
                        this._selectionService.enable()),
                      8 & w
                        ? g.mousemove ||
                          (x.addEventListener("mousemove", a.mousemove),
                          (g.mousemove = a.mousemove))
                        : (x.removeEventListener("mousemove", g.mousemove),
                          (g.mousemove = null)),
                      16 & w
                        ? g.wheel ||
                          (x.addEventListener("wheel", a.wheel, {
                            passive: !1,
                          }),
                          (g.wheel = a.wheel))
                        : (x.removeEventListener("wheel", g.wheel),
                          (g.wheel = null)),
                      2 & w
                        ? g.mouseup ||
                          (x.addEventListener("mouseup", a.mouseup),
                          (g.mouseup = a.mouseup))
                        : (this._document.removeEventListener(
                            "mouseup",
                            g.mouseup
                          ),
                          x.removeEventListener("mouseup", g.mouseup),
                          (g.mouseup = null)),
                      4 & w
                        ? g.mousedrag || (g.mousedrag = a.mousedrag)
                        : (this._document.removeEventListener(
                            "mousemove",
                            g.mousedrag
                          ),
                          (g.mousedrag = null));
                  })
                ),
                  (this.coreMouseService.activeProtocol =
                    this.coreMouseService.activeProtocol),
                  this.register(
                    (0, V.addDisposableDomListener)(x, "mousedown", (w) => {
                      if (
                        (w.preventDefault(),
                        this.focus(),
                        this.coreMouseService.areMouseEventsActive &&
                          !this._selectionService.shouldForceSelection(w))
                      )
                        return (
                          C(w),
                          g.mouseup &&
                            this._document.addEventListener(
                              "mouseup",
                              g.mouseup
                            ),
                          g.mousedrag &&
                            this._document.addEventListener(
                              "mousemove",
                              g.mousedrag
                            ),
                          this.cancel(w)
                        );
                    })
                  ),
                  this.register(
                    (0, V.addDisposableDomListener)(
                      x,
                      "wheel",
                      (w) => {
                        if (!g.wheel) {
                          if (!this.buffer.hasScrollback) {
                            let r = this.viewport.getLinesScrolled(w);
                            if (r === 0) return;
                            let h =
                                R.C0.ESC +
                                (this.coreService.decPrivateModes
                                  .applicationCursorKeys
                                  ? "O"
                                  : "[") +
                                (w.deltaY < 0 ? "A" : "B"),
                              s = "";
                            for (let qQ = 0; qQ < Math.abs(r); qQ++) s += h;
                            return (
                              this.coreService.triggerDataEvent(s, !0),
                              this.cancel(w, !0)
                            );
                          }
                          return this.viewport.handleWheel(w)
                            ? this.cancel(w)
                            : void 0;
                        }
                      },
                      { passive: !1 }
                    )
                  ),
                  this.register(
                    (0, V.addDisposableDomListener)(
                      x,
                      "touchstart",
                      (w) => {
                        if (!this.coreMouseService.areMouseEventsActive)
                          return (
                            this.viewport.handleTouchStart(w), this.cancel(w)
                          );
                      },
                      { passive: !0 }
                    )
                  ),
                  this.register(
                    (0, V.addDisposableDomListener)(
                      x,
                      "touchmove",
                      (w) => {
                        if (!this.coreMouseService.areMouseEventsActive)
                          return this.viewport.handleTouchMove(w)
                            ? void 0
                            : this.cancel(w);
                      },
                      { passive: !1 }
                    )
                  );
              }
              refresh(T, x) {
                var C;
                (C = this._renderService) === null ||
                  C === void 0 ||
                  C.refreshRows(T, x);
              }
              updateCursorStyle(T) {
                var x;
                (
                  (x = this._selectionService) === null || x === void 0
                    ? void 0
                    : x.shouldColumnSelect(T)
                )
                  ? this.element.classList.add("column-select")
                  : this.element.classList.remove("column-select");
              }
              _showCursor() {
                this.coreService.isCursorInitialized ||
                  ((this.coreService.isCursorInitialized = !0),
                  this.refresh(this.buffer.y, this.buffer.y));
              }
              scrollLines(T, x, C = 0) {
                var g;
                C === 1
                  ? (super.scrollLines(T, x, C), this.refresh(0, this.rows - 1))
                  : (g = this.viewport) === null ||
                    g === void 0 ||
                    g.scrollLines(T);
              }
              paste(T) {
                (0, P.paste)(
                  T,
                  this.textarea,
                  this.coreService,
                  this.optionsService
                );
              }
              attachCustomKeyEventHandler(T) {
                this._customKeyEventHandler = T;
              }
              registerLinkProvider(T) {
                return this.linkifier2.registerLinkProvider(T);
              }
              registerCharacterJoiner(T) {
                if (!this._characterJoinerService)
                  throw Error("Terminal must be opened first");
                let x = this._characterJoinerService.register(T);
                return this.refresh(0, this.rows - 1), x;
              }
              deregisterCharacterJoiner(T) {
                if (!this._characterJoinerService)
                  throw Error("Terminal must be opened first");
                this._characterJoinerService.deregister(T) &&
                  this.refresh(0, this.rows - 1);
              }
              get markers() {
                return this.buffer.markers;
              }
              registerMarker(T) {
                return this.buffer.addMarker(
                  this.buffer.ybase + this.buffer.y + T
                );
              }
              registerDecoration(T) {
                return this._decorationService.registerDecoration(T);
              }
              hasSelection() {
                return (
                  !!this._selectionService &&
                  this._selectionService.hasSelection
                );
              }
              select(T, x, C) {
                this._selectionService.setSelection(T, x, C);
              }
              getSelection() {
                return this._selectionService
                  ? this._selectionService.selectionText
                  : "";
              }
              getSelectionPosition() {
                if (
                  this._selectionService &&
                  this._selectionService.hasSelection
                )
                  return {
                    start: {
                      x: this._selectionService.selectionStart[0],
                      y: this._selectionService.selectionStart[1],
                    },
                    end: {
                      x: this._selectionService.selectionEnd[0],
                      y: this._selectionService.selectionEnd[1],
                    },
                  };
              }
              clearSelection() {
                var T;
                (T = this._selectionService) === null ||
                  T === void 0 ||
                  T.clearSelection();
              }
              selectAll() {
                var T;
                (T = this._selectionService) === null ||
                  T === void 0 ||
                  T.selectAll();
              }
              selectLines(T, x) {
                var C;
                (C = this._selectionService) === null ||
                  C === void 0 ||
                  C.selectLines(T, x);
              }
              _keyDown(T) {
                if (
                  ((this._keyDownHandled = !1),
                  (this._keyDownSeen = !0),
                  this._customKeyEventHandler &&
                    this._customKeyEventHandler(T) === !1)
                )
                  return !1;
                let x =
                  this.browser.isMac &&
                  this.options.macOptionIsMeta &&
                  T.altKey;
                if (!x && !this._compositionHelper.keydown(T))
                  return (
                    this.options.scrollOnUserInput &&
                      this.buffer.ybase !== this.buffer.ydisp &&
                      this.scrollToBottom(),
                    !1
                  );
                x ||
                  (T.key !== "Dead" && T.key !== "AltGraph") ||
                  (this._unprocessedDeadKey = !0);
                let C = (0, D.evaluateKeyboardEvent)(
                  T,
                  this.coreService.decPrivateModes.applicationCursorKeys,
                  this.browser.isMac,
                  this.options.macOptionIsMeta
                );
                if ((this.updateCursorStyle(T), C.type === 3 || C.type === 2)) {
                  let g = this.rows - 1;
                  return (
                    this.scrollLines(C.type === 2 ? -g : g), this.cancel(T, !0)
                  );
                }
                return (
                  C.type === 1 && this.selectAll(),
                  !!this._isThirdLevelShift(this.browser, T) ||
                    (C.cancel && this.cancel(T, !0),
                    !C.key ||
                      !!(
                        T.key &&
                        !T.ctrlKey &&
                        !T.altKey &&
                        !T.metaKey &&
                        T.key.length === 1 &&
                        T.key.charCodeAt(0) >= 65 &&
                        T.key.charCodeAt(0) <= 90
                      ) ||
                      (this._unprocessedDeadKey
                        ? ((this._unprocessedDeadKey = !1), !0)
                        : ((C.key !== R.C0.ETX && C.key !== R.C0.CR) ||
                            (this.textarea.value = ""),
                          this._onKey.fire({ key: C.key, domEvent: T }),
                          this._showCursor(),
                          this.coreService.triggerDataEvent(C.key, !0),
                          !this.optionsService.rawOptions.screenReaderMode ||
                          T.altKey ||
                          T.ctrlKey
                            ? this.cancel(T, !0)
                            : void (this._keyDownHandled = !0))))
                );
              }
              _isThirdLevelShift(T, x) {
                let C =
                  (T.isMac &&
                    !this.options.macOptionIsMeta &&
                    x.altKey &&
                    !x.ctrlKey &&
                    !x.metaKey) ||
                  (T.isWindows && x.altKey && x.ctrlKey && !x.metaKey) ||
                  (T.isWindows && x.getModifierState("AltGraph"));
                return x.type === "keypress"
                  ? C
                  : C && (!x.keyCode || x.keyCode > 47);
              }
              _keyUp(T) {
                (this._keyDownSeen = !1),
                  (this._customKeyEventHandler &&
                    this._customKeyEventHandler(T) === !1) ||
                    ((function (x) {
                      return (
                        x.keyCode === 16 || x.keyCode === 17 || x.keyCode === 18
                      );
                    })(T) || this.focus(),
                    this.updateCursorStyle(T),
                    (this._keyPressHandled = !1));
              }
              _keyPress(T) {
                let x;
                if (((this._keyPressHandled = !1), this._keyDownHandled))
                  return !1;
                if (
                  this._customKeyEventHandler &&
                  this._customKeyEventHandler(T) === !1
                )
                  return !1;
                if ((this.cancel(T), T.charCode)) x = T.charCode;
                else if (T.which === null || T.which === void 0) x = T.keyCode;
                else {
                  if (T.which === 0 || T.charCode === 0) return !1;
                  x = T.which;
                }
                return !(
                  !x ||
                  ((T.altKey || T.ctrlKey || T.metaKey) &&
                    !this._isThirdLevelShift(this.browser, T)) ||
                  ((x = String.fromCharCode(x)),
                  this._onKey.fire({ key: x, domEvent: T }),
                  this._showCursor(),
                  this.coreService.triggerDataEvent(x, !0),
                  (this._keyPressHandled = !0),
                  (this._unprocessedDeadKey = !1),
                  0)
                );
              }
              _inputEvent(T) {
                if (
                  T.data &&
                  T.inputType === "insertText" &&
                  (!T.composed || !this._keyDownSeen) &&
                  !this.optionsService.rawOptions.screenReaderMode
                ) {
                  if (this._keyPressHandled) return !1;
                  this._unprocessedDeadKey = !1;
                  let x = T.data;
                  return (
                    this.coreService.triggerDataEvent(x, !0), this.cancel(T), !0
                  );
                }
                return !1;
              }
              resize(T, x) {
                T !== this.cols || x !== this.rows
                  ? super.resize(T, x)
                  : this._charSizeService &&
                    !this._charSizeService.hasValidSize &&
                    this._charSizeService.measure();
              }
              _afterResize(T, x) {
                var C, g;
                (C = this._charSizeService) === null ||
                  C === void 0 ||
                  C.measure(),
                  (g = this.viewport) === null ||
                    g === void 0 ||
                    g.syncScrollArea(!0);
              }
              clear() {
                var T;
                if (this.buffer.ybase !== 0 || this.buffer.y !== 0) {
                  this.buffer.clearAllMarkers(),
                    this.buffer.lines.set(
                      0,
                      this.buffer.lines.get(this.buffer.ybase + this.buffer.y)
                    ),
                    (this.buffer.lines.length = 1),
                    (this.buffer.ydisp = 0),
                    (this.buffer.ybase = 0),
                    (this.buffer.y = 0);
                  for (let x = 1; x < this.rows; x++)
                    this.buffer.lines.push(
                      this.buffer.getBlankLine(I.DEFAULT_ATTR_DATA)
                    );
                  this._onScroll.fire({
                    position: this.buffer.ydisp,
                    source: 0,
                  }),
                    (T = this.viewport) === null || T === void 0 || T.reset(),
                    this.refresh(0, this.rows - 1);
                }
              }
              reset() {
                var T, x;
                (this.options.rows = this.rows),
                  (this.options.cols = this.cols);
                let C = this._customKeyEventHandler;
                this._setup(),
                  super.reset(),
                  (T = this._selectionService) === null ||
                    T === void 0 ||
                    T.reset(),
                  this._decorationService.reset(),
                  (x = this.viewport) === null || x === void 0 || x.reset(),
                  (this._customKeyEventHandler = C),
                  this.refresh(0, this.rows - 1);
              }
              clearTextureAtlas() {
                var T;
                (T = this._renderService) === null ||
                  T === void 0 ||
                  T.clearTextureAtlas();
              }
              _reportFocus() {
                var T;
                (
                  (T = this.element) === null || T === void 0
                    ? void 0
                    : T.classList.contains("focus")
                )
                  ? this.coreService.triggerDataEvent(R.C0.ESC + "[I")
                  : this.coreService.triggerDataEvent(R.C0.ESC + "[O");
              }
              _reportWindowsOptions(T) {
                if (this._renderService)
                  switch (T) {
                    case m.WindowsOptionsReportType.GET_WIN_SIZE_PIXELS:
                      let x =
                          this._renderService.dimensions.css.canvas.width.toFixed(
                            0
                          ),
                        C =
                          this._renderService.dimensions.css.canvas.height.toFixed(
                            0
                          );
                      this.coreService.triggerDataEvent(
                        `${R.C0.ESC}[4;${C};${x}t`
                      );
                      break;
                    case m.WindowsOptionsReportType.GET_CELL_SIZE_PIXELS:
                      let g =
                          this._renderService.dimensions.css.cell.width.toFixed(
                            0
                          ),
                        a =
                          this._renderService.dimensions.css.cell.height.toFixed(
                            0
                          );
                      this.coreService.triggerDataEvent(
                        `${R.C0.ESC}[6;${a};${g}t`
                      );
                  }
              }
              cancel(T, x) {
                if (this.options.cancelEvents || x)
                  return T.preventDefault(), T.stopPropagation(), !1;
              }
            }
            H.Terminal = d;
          },
          9924: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.TimeBasedDebouncer = void 0),
              (H.TimeBasedDebouncer = class {
                constructor(K, P = 1000) {
                  (this._renderCallback = K),
                    (this._debounceThresholdMS = P),
                    (this._lastRefreshMs = 0),
                    (this._additionalRefreshRequested = !1);
                }
                dispose() {
                  this._refreshTimeoutID &&
                    clearTimeout(this._refreshTimeoutID);
                }
                refresh(K, P, V) {
                  (this._rowCount = V),
                    (K = K !== void 0 ? K : 0),
                    (P = P !== void 0 ? P : this._rowCount - 1),
                    (this._rowStart =
                      this._rowStart !== void 0
                        ? Math.min(this._rowStart, K)
                        : K),
                    (this._rowEnd =
                      this._rowEnd !== void 0 ? Math.max(this._rowEnd, P) : P);
                  let q = Date.now();
                  if (q - this._lastRefreshMs >= this._debounceThresholdMS)
                    (this._lastRefreshMs = q), this._innerRefresh();
                  else if (!this._additionalRefreshRequested) {
                    let J = q - this._lastRefreshMs,
                      N = this._debounceThresholdMS - J;
                    (this._additionalRefreshRequested = !0),
                      (this._refreshTimeoutID = window.setTimeout(() => {
                        (this._lastRefreshMs = Date.now()),
                          this._innerRefresh(),
                          (this._additionalRefreshRequested = !1),
                          (this._refreshTimeoutID = void 0);
                      }, N));
                  }
                }
                _innerRefresh() {
                  if (
                    this._rowStart === void 0 ||
                    this._rowEnd === void 0 ||
                    this._rowCount === void 0
                  )
                    return;
                  let K = Math.max(this._rowStart, 0),
                    P = Math.min(this._rowEnd, this._rowCount - 1);
                  (this._rowStart = void 0),
                    (this._rowEnd = void 0),
                    this._renderCallback(K, P);
                }
              });
          },
          1680: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (W, Z, Y, F) {
                  var j,
                    $ = arguments.length,
                    E =
                      $ < 3
                        ? Z
                        : F === null
                          ? (F = Object.getOwnPropertyDescriptor(Z, Y))
                          : F;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    E = Reflect.decorate(W, Z, Y, F);
                  else
                    for (var U = W.length - 1; U >= 0; U--)
                      (j = W[U]) &&
                        (E =
                          ($ < 3 ? j(E) : $ > 3 ? j(Z, Y, E) : j(Z, Y)) || E);
                  return $ > 3 && E && Object.defineProperty(Z, Y, E), E;
                },
              V =
                (this && this.__param) ||
                function (W, Z) {
                  return function (Y, F) {
                    Z(Y, F, W);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.Viewport = void 0);
            let q = K(3656),
              J = K(4725),
              N = K(8460),
              X = K(844),
              G = K(2585),
              Q = (H.Viewport = class extends X.Disposable {
                constructor(W, Z, Y, F, j, $, E, U) {
                  super(),
                    (this._viewportElement = W),
                    (this._scrollArea = Z),
                    (this._bufferService = Y),
                    (this._optionsService = F),
                    (this._charSizeService = j),
                    (this._renderService = $),
                    (this._coreBrowserService = E),
                    (this.scrollBarWidth = 0),
                    (this._currentRowHeight = 0),
                    (this._currentDeviceCellHeight = 0),
                    (this._lastRecordedBufferLength = 0),
                    (this._lastRecordedViewportHeight = 0),
                    (this._lastRecordedBufferHeight = 0),
                    (this._lastTouchY = 0),
                    (this._lastScrollTop = 0),
                    (this._wheelPartialScroll = 0),
                    (this._refreshAnimationFrame = null),
                    (this._ignoreNextScrollEvent = !1),
                    (this._smoothScrollState = {
                      startTime: 0,
                      origin: -1,
                      target: -1,
                    }),
                    (this._onRequestScrollLines = this.register(
                      new N.EventEmitter()
                    )),
                    (this.onRequestScrollLines =
                      this._onRequestScrollLines.event),
                    (this.scrollBarWidth =
                      this._viewportElement.offsetWidth -
                        this._scrollArea.offsetWidth || 15),
                    this.register(
                      (0, q.addDisposableDomListener)(
                        this._viewportElement,
                        "scroll",
                        this._handleScroll.bind(this)
                      )
                    ),
                    (this._activeBuffer = this._bufferService.buffer),
                    this.register(
                      this._bufferService.buffers.onBufferActivate(
                        (z) => (this._activeBuffer = z.activeBuffer)
                      )
                    ),
                    (this._renderDimensions = this._renderService.dimensions),
                    this.register(
                      this._renderService.onDimensionsChange(
                        (z) => (this._renderDimensions = z)
                      )
                    ),
                    this._handleThemeChange(U.colors),
                    this.register(
                      U.onChangeColors((z) => this._handleThemeChange(z))
                    ),
                    this.register(
                      this._optionsService.onSpecificOptionChange(
                        "scrollback",
                        () => this.syncScrollArea()
                      )
                    ),
                    setTimeout(() => this.syncScrollArea());
                }
                _handleThemeChange(W) {
                  this._viewportElement.style.backgroundColor =
                    W.background.css;
                }
                reset() {
                  (this._currentRowHeight = 0),
                    (this._currentDeviceCellHeight = 0),
                    (this._lastRecordedBufferLength = 0),
                    (this._lastRecordedViewportHeight = 0),
                    (this._lastRecordedBufferHeight = 0),
                    (this._lastTouchY = 0),
                    (this._lastScrollTop = 0),
                    this._coreBrowserService.window.requestAnimationFrame(() =>
                      this.syncScrollArea()
                    );
                }
                _refresh(W) {
                  if (W)
                    return (
                      this._innerRefresh(),
                      void (
                        this._refreshAnimationFrame !== null &&
                        this._coreBrowserService.window.cancelAnimationFrame(
                          this._refreshAnimationFrame
                        )
                      )
                    );
                  this._refreshAnimationFrame === null &&
                    (this._refreshAnimationFrame =
                      this._coreBrowserService.window.requestAnimationFrame(
                        () => this._innerRefresh()
                      ));
                }
                _innerRefresh() {
                  if (this._charSizeService.height > 0) {
                    (this._currentRowHeight =
                      this._renderService.dimensions.device.cell.height /
                      this._coreBrowserService.dpr),
                      (this._currentDeviceCellHeight =
                        this._renderService.dimensions.device.cell.height),
                      (this._lastRecordedViewportHeight =
                        this._viewportElement.offsetHeight);
                    let Z =
                      Math.round(
                        this._currentRowHeight * this._lastRecordedBufferLength
                      ) +
                      (this._lastRecordedViewportHeight -
                        this._renderService.dimensions.css.canvas.height);
                    this._lastRecordedBufferHeight !== Z &&
                      ((this._lastRecordedBufferHeight = Z),
                      (this._scrollArea.style.height =
                        this._lastRecordedBufferHeight + "px"));
                  }
                  let W =
                    this._bufferService.buffer.ydisp * this._currentRowHeight;
                  this._viewportElement.scrollTop !== W &&
                    ((this._ignoreNextScrollEvent = !0),
                    (this._viewportElement.scrollTop = W)),
                    (this._refreshAnimationFrame = null);
                }
                syncScrollArea(W = !1) {
                  if (
                    this._lastRecordedBufferLength !==
                    this._bufferService.buffer.lines.length
                  )
                    return (
                      (this._lastRecordedBufferLength =
                        this._bufferService.buffer.lines.length),
                      void this._refresh(W)
                    );
                  (this._lastRecordedViewportHeight ===
                    this._renderService.dimensions.css.canvas.height &&
                    this._lastScrollTop ===
                      this._activeBuffer.ydisp * this._currentRowHeight &&
                    this._renderDimensions.device.cell.height ===
                      this._currentDeviceCellHeight) ||
                    this._refresh(W);
                }
                _handleScroll(W) {
                  if (
                    ((this._lastScrollTop = this._viewportElement.scrollTop),
                    !this._viewportElement.offsetParent)
                  )
                    return;
                  if (this._ignoreNextScrollEvent)
                    return (
                      (this._ignoreNextScrollEvent = !1),
                      void this._onRequestScrollLines.fire({
                        amount: 0,
                        suppressScrollEvent: !0,
                      })
                    );
                  let Z =
                    Math.round(this._lastScrollTop / this._currentRowHeight) -
                    this._bufferService.buffer.ydisp;
                  this._onRequestScrollLines.fire({
                    amount: Z,
                    suppressScrollEvent: !0,
                  });
                }
                _smoothScroll() {
                  if (
                    this._isDisposed ||
                    this._smoothScrollState.origin === -1 ||
                    this._smoothScrollState.target === -1
                  )
                    return;
                  let W = this._smoothScrollPercent();
                  (this._viewportElement.scrollTop =
                    this._smoothScrollState.origin +
                    Math.round(
                      W *
                        (this._smoothScrollState.target -
                          this._smoothScrollState.origin)
                    )),
                    W < 1
                      ? this._coreBrowserService.window.requestAnimationFrame(
                          () => this._smoothScroll()
                        )
                      : this._clearSmoothScrollState();
                }
                _smoothScrollPercent() {
                  return this._optionsService.rawOptions.smoothScrollDuration &&
                    this._smoothScrollState.startTime
                    ? Math.max(
                        Math.min(
                          (Date.now() - this._smoothScrollState.startTime) /
                            this._optionsService.rawOptions
                              .smoothScrollDuration,
                          1
                        ),
                        0
                      )
                    : 1;
                }
                _clearSmoothScrollState() {
                  (this._smoothScrollState.startTime = 0),
                    (this._smoothScrollState.origin = -1),
                    (this._smoothScrollState.target = -1);
                }
                _bubbleScroll(W, Z) {
                  let Y =
                    this._viewportElement.scrollTop +
                    this._lastRecordedViewportHeight;
                  return (
                    !(
                      (Z < 0 && this._viewportElement.scrollTop !== 0) ||
                      (Z > 0 && Y < this._lastRecordedBufferHeight)
                    ) || (W.cancelable && W.preventDefault(), !1)
                  );
                }
                handleWheel(W) {
                  let Z = this._getPixelsScrolled(W);
                  return (
                    Z !== 0 &&
                    (this._optionsService.rawOptions.smoothScrollDuration
                      ? ((this._smoothScrollState.startTime = Date.now()),
                        this._smoothScrollPercent() < 1
                          ? ((this._smoothScrollState.origin =
                              this._viewportElement.scrollTop),
                            this._smoothScrollState.target === -1
                              ? (this._smoothScrollState.target =
                                  this._viewportElement.scrollTop + Z)
                              : (this._smoothScrollState.target += Z),
                            (this._smoothScrollState.target = Math.max(
                              Math.min(
                                this._smoothScrollState.target,
                                this._viewportElement.scrollHeight
                              ),
                              0
                            )),
                            this._smoothScroll())
                          : this._clearSmoothScrollState())
                      : (this._viewportElement.scrollTop += Z),
                    this._bubbleScroll(W, Z))
                  );
                }
                scrollLines(W) {
                  if (W !== 0)
                    if (this._optionsService.rawOptions.smoothScrollDuration) {
                      let Z = W * this._currentRowHeight;
                      (this._smoothScrollState.startTime = Date.now()),
                        this._smoothScrollPercent() < 1
                          ? ((this._smoothScrollState.origin =
                              this._viewportElement.scrollTop),
                            (this._smoothScrollState.target =
                              this._smoothScrollState.origin + Z),
                            (this._smoothScrollState.target = Math.max(
                              Math.min(
                                this._smoothScrollState.target,
                                this._viewportElement.scrollHeight
                              ),
                              0
                            )),
                            this._smoothScroll())
                          : this._clearSmoothScrollState();
                    } else
                      this._onRequestScrollLines.fire({
                        amount: W,
                        suppressScrollEvent: !1,
                      });
                }
                _getPixelsScrolled(W) {
                  if (W.deltaY === 0 || W.shiftKey) return 0;
                  let Z = this._applyScrollModifier(W.deltaY, W);
                  return (
                    W.deltaMode === WheelEvent.DOM_DELTA_LINE
                      ? (Z *= this._currentRowHeight)
                      : W.deltaMode === WheelEvent.DOM_DELTA_PAGE &&
                        (Z *=
                          this._currentRowHeight * this._bufferService.rows),
                    Z
                  );
                }
                getBufferElements(W, Z) {
                  var Y;
                  let F,
                    j = "",
                    $ = [],
                    E = Z != null ? Z : this._bufferService.buffer.lines.length,
                    U = this._bufferService.buffer.lines;
                  for (let z = W; z < E; z++) {
                    let k = U.get(z);
                    if (!k) continue;
                    let O =
                      (Y = U.get(z + 1)) === null || Y === void 0
                        ? void 0
                        : Y.isWrapped;
                    if (
                      ((j += k.translateToString(!O)), !O || z === U.length - 1)
                    ) {
                      let L = document.createElement("div");
                      (L.textContent = j),
                        $.push(L),
                        j.length > 0 && (F = L),
                        (j = "");
                    }
                  }
                  return { bufferElements: $, cursorElement: F };
                }
                getLinesScrolled(W) {
                  if (W.deltaY === 0 || W.shiftKey) return 0;
                  let Z = this._applyScrollModifier(W.deltaY, W);
                  return (
                    W.deltaMode === WheelEvent.DOM_DELTA_PIXEL
                      ? ((Z /= this._currentRowHeight + 0),
                        (this._wheelPartialScroll += Z),
                        (Z =
                          Math.floor(Math.abs(this._wheelPartialScroll)) *
                          (this._wheelPartialScroll > 0 ? 1 : -1)),
                        (this._wheelPartialScroll %= 1))
                      : W.deltaMode === WheelEvent.DOM_DELTA_PAGE &&
                        (Z *= this._bufferService.rows),
                    Z
                  );
                }
                _applyScrollModifier(W, Z) {
                  let Y = this._optionsService.rawOptions.fastScrollModifier;
                  return (Y === "alt" && Z.altKey) ||
                    (Y === "ctrl" && Z.ctrlKey) ||
                    (Y === "shift" && Z.shiftKey)
                    ? W *
                        this._optionsService.rawOptions.fastScrollSensitivity *
                        this._optionsService.rawOptions.scrollSensitivity
                    : W * this._optionsService.rawOptions.scrollSensitivity;
                }
                handleTouchStart(W) {
                  this._lastTouchY = W.touches[0].pageY;
                }
                handleTouchMove(W) {
                  let Z = this._lastTouchY - W.touches[0].pageY;
                  return (
                    (this._lastTouchY = W.touches[0].pageY),
                    Z !== 0 &&
                      ((this._viewportElement.scrollTop += Z),
                      this._bubbleScroll(W, Z))
                  );
                }
              });
            H.Viewport = Q = P(
              [
                V(2, G.IBufferService),
                V(3, G.IOptionsService),
                V(4, J.ICharSizeService),
                V(5, J.IRenderService),
                V(6, J.ICoreBrowserService),
                V(7, J.IThemeService),
              ],
              Q
            );
          },
          3107: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (Q, W, Z, Y) {
                  var F,
                    j = arguments.length,
                    $ =
                      j < 3
                        ? W
                        : Y === null
                          ? (Y = Object.getOwnPropertyDescriptor(W, Z))
                          : Y;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    $ = Reflect.decorate(Q, W, Z, Y);
                  else
                    for (var E = Q.length - 1; E >= 0; E--)
                      (F = Q[E]) &&
                        ($ =
                          (j < 3 ? F($) : j > 3 ? F(W, Z, $) : F(W, Z)) || $);
                  return j > 3 && $ && Object.defineProperty(W, Z, $), $;
                },
              V =
                (this && this.__param) ||
                function (Q, W) {
                  return function (Z, Y) {
                    W(Z, Y, Q);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.BufferDecorationRenderer = void 0);
            let q = K(3656),
              J = K(4725),
              N = K(844),
              X = K(2585),
              G = (H.BufferDecorationRenderer = class extends N.Disposable {
                constructor(Q, W, Z, Y) {
                  super(),
                    (this._screenElement = Q),
                    (this._bufferService = W),
                    (this._decorationService = Z),
                    (this._renderService = Y),
                    (this._decorationElements = new Map()),
                    (this._altBufferIsActive = !1),
                    (this._dimensionsChanged = !1),
                    (this._container = document.createElement("div")),
                    this._container.classList.add("xterm-decoration-container"),
                    this._screenElement.appendChild(this._container),
                    this.register(
                      this._renderService.onRenderedViewportChange(() =>
                        this._doRefreshDecorations()
                      )
                    ),
                    this.register(
                      this._renderService.onDimensionsChange(() => {
                        (this._dimensionsChanged = !0), this._queueRefresh();
                      })
                    ),
                    this.register(
                      (0, q.addDisposableDomListener)(window, "resize", () =>
                        this._queueRefresh()
                      )
                    ),
                    this.register(
                      this._bufferService.buffers.onBufferActivate(() => {
                        this._altBufferIsActive =
                          this._bufferService.buffer ===
                          this._bufferService.buffers.alt;
                      })
                    ),
                    this.register(
                      this._decorationService.onDecorationRegistered(() =>
                        this._queueRefresh()
                      )
                    ),
                    this.register(
                      this._decorationService.onDecorationRemoved((F) =>
                        this._removeDecoration(F)
                      )
                    ),
                    this.register(
                      (0, N.toDisposable)(() => {
                        this._container.remove(),
                          this._decorationElements.clear();
                      })
                    );
                }
                _queueRefresh() {
                  this._animationFrame === void 0 &&
                    (this._animationFrame =
                      this._renderService.addRefreshCallback(() => {
                        this._doRefreshDecorations(),
                          (this._animationFrame = void 0);
                      }));
                }
                _doRefreshDecorations() {
                  for (let Q of this._decorationService.decorations)
                    this._renderDecoration(Q);
                  this._dimensionsChanged = !1;
                }
                _renderDecoration(Q) {
                  this._refreshStyle(Q),
                    this._dimensionsChanged && this._refreshXPosition(Q);
                }
                _createElement(Q) {
                  var W, Z;
                  let Y = document.createElement("div");
                  Y.classList.add("xterm-decoration"),
                    Y.classList.toggle(
                      "xterm-decoration-top-layer",
                      ((W = Q == null ? void 0 : Q.options) === null ||
                      W === void 0
                        ? void 0
                        : W.layer) === "top"
                    ),
                    (Y.style.width = `${Math.round((Q.options.width || 1) * this._renderService.dimensions.css.cell.width)}px`),
                    (Y.style.height =
                      (Q.options.height || 1) *
                        this._renderService.dimensions.css.cell.height +
                      "px"),
                    (Y.style.top =
                      (Q.marker.line -
                        this._bufferService.buffers.active.ydisp) *
                        this._renderService.dimensions.css.cell.height +
                      "px"),
                    (Y.style.lineHeight = `${this._renderService.dimensions.css.cell.height}px`);
                  let F = (Z = Q.options.x) !== null && Z !== void 0 ? Z : 0;
                  return (
                    F &&
                      F > this._bufferService.cols &&
                      (Y.style.display = "none"),
                    this._refreshXPosition(Q, Y),
                    Y
                  );
                }
                _refreshStyle(Q) {
                  let W =
                    Q.marker.line - this._bufferService.buffers.active.ydisp;
                  if (W < 0 || W >= this._bufferService.rows)
                    Q.element &&
                      ((Q.element.style.display = "none"),
                      Q.onRenderEmitter.fire(Q.element));
                  else {
                    let Z = this._decorationElements.get(Q);
                    Z ||
                      ((Z = this._createElement(Q)),
                      (Q.element = Z),
                      this._decorationElements.set(Q, Z),
                      this._container.appendChild(Z),
                      Q.onDispose(() => {
                        this._decorationElements.delete(Q), Z.remove();
                      })),
                      (Z.style.top =
                        W * this._renderService.dimensions.css.cell.height +
                        "px"),
                      (Z.style.display = this._altBufferIsActive
                        ? "none"
                        : "block"),
                      Q.onRenderEmitter.fire(Z);
                  }
                }
                _refreshXPosition(Q, W = Q.element) {
                  var Z;
                  if (!W) return;
                  let Y = (Z = Q.options.x) !== null && Z !== void 0 ? Z : 0;
                  (Q.options.anchor || "left") === "right"
                    ? (W.style.right = Y
                        ? Y * this._renderService.dimensions.css.cell.width +
                          "px"
                        : "")
                    : (W.style.left = Y
                        ? Y * this._renderService.dimensions.css.cell.width +
                          "px"
                        : "");
                }
                _removeDecoration(Q) {
                  var W;
                  (W = this._decorationElements.get(Q)) === null ||
                    W === void 0 ||
                    W.remove(),
                    this._decorationElements.delete(Q),
                    Q.dispose();
                }
              });
            H.BufferDecorationRenderer = G = P(
              [
                V(1, X.IBufferService),
                V(2, X.IDecorationService),
                V(3, J.IRenderService),
              ],
              G
            );
          },
          5871: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.ColorZoneStore = void 0),
              (H.ColorZoneStore = class {
                constructor() {
                  (this._zones = []),
                    (this._zonePool = []),
                    (this._zonePoolIndex = 0),
                    (this._linePadding = {
                      full: 0,
                      left: 0,
                      center: 0,
                      right: 0,
                    });
                }
                get zones() {
                  return (
                    (this._zonePool.length = Math.min(
                      this._zonePool.length,
                      this._zones.length
                    )),
                    this._zones
                  );
                }
                clear() {
                  (this._zones.length = 0), (this._zonePoolIndex = 0);
                }
                addDecoration(K) {
                  if (K.options.overviewRulerOptions) {
                    for (let P of this._zones)
                      if (
                        P.color === K.options.overviewRulerOptions.color &&
                        P.position === K.options.overviewRulerOptions.position
                      ) {
                        if (this._lineIntersectsZone(P, K.marker.line)) return;
                        if (
                          this._lineAdjacentToZone(
                            P,
                            K.marker.line,
                            K.options.overviewRulerOptions.position
                          )
                        )
                          return void this._addLineToZone(P, K.marker.line);
                      }
                    if (this._zonePoolIndex < this._zonePool.length)
                      return (
                        (this._zonePool[this._zonePoolIndex].color =
                          K.options.overviewRulerOptions.color),
                        (this._zonePool[this._zonePoolIndex].position =
                          K.options.overviewRulerOptions.position),
                        (this._zonePool[this._zonePoolIndex].startBufferLine =
                          K.marker.line),
                        (this._zonePool[this._zonePoolIndex].endBufferLine =
                          K.marker.line),
                        void this._zones.push(
                          this._zonePool[this._zonePoolIndex++]
                        )
                      );
                    this._zones.push({
                      color: K.options.overviewRulerOptions.color,
                      position: K.options.overviewRulerOptions.position,
                      startBufferLine: K.marker.line,
                      endBufferLine: K.marker.line,
                    }),
                      this._zonePool.push(this._zones[this._zones.length - 1]),
                      this._zonePoolIndex++;
                  }
                }
                setPadding(K) {
                  this._linePadding = K;
                }
                _lineIntersectsZone(K, P) {
                  return P >= K.startBufferLine && P <= K.endBufferLine;
                }
                _lineAdjacentToZone(K, P, V) {
                  return (
                    P >= K.startBufferLine - this._linePadding[V || "full"] &&
                    P <= K.endBufferLine + this._linePadding[V || "full"]
                  );
                }
                _addLineToZone(K, P) {
                  (K.startBufferLine = Math.min(K.startBufferLine, P)),
                    (K.endBufferLine = Math.max(K.endBufferLine, P));
                }
              });
          },
          5744: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (F, j, $, E) {
                  var U,
                    z = arguments.length,
                    k =
                      z < 3
                        ? j
                        : E === null
                          ? (E = Object.getOwnPropertyDescriptor(j, $))
                          : E;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    k = Reflect.decorate(F, j, $, E);
                  else
                    for (var O = F.length - 1; O >= 0; O--)
                      (U = F[O]) &&
                        (k =
                          (z < 3 ? U(k) : z > 3 ? U(j, $, k) : U(j, $)) || k);
                  return z > 3 && k && Object.defineProperty(j, $, k), k;
                },
              V =
                (this && this.__param) ||
                function (F, j) {
                  return function ($, E) {
                    j($, E, F);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.OverviewRulerRenderer = void 0);
            let q = K(5871),
              J = K(3656),
              N = K(4725),
              X = K(844),
              G = K(2585),
              Q = { full: 0, left: 0, center: 0, right: 0 },
              W = { full: 0, left: 0, center: 0, right: 0 },
              Z = { full: 0, left: 0, center: 0, right: 0 },
              Y = (H.OverviewRulerRenderer = class extends X.Disposable {
                get _width() {
                  return this._optionsService.options.overviewRulerWidth || 0;
                }
                constructor(F, j, $, E, U, z, k) {
                  var O;
                  super(),
                    (this._viewportElement = F),
                    (this._screenElement = j),
                    (this._bufferService = $),
                    (this._decorationService = E),
                    (this._renderService = U),
                    (this._optionsService = z),
                    (this._coreBrowseService = k),
                    (this._colorZoneStore = new q.ColorZoneStore()),
                    (this._shouldUpdateDimensions = !0),
                    (this._shouldUpdateAnchor = !0),
                    (this._lastKnownBufferLength = 0),
                    (this._canvas = document.createElement("canvas")),
                    this._canvas.classList.add(
                      "xterm-decoration-overview-ruler"
                    ),
                    this._refreshCanvasDimensions(),
                    (O = this._viewportElement.parentElement) === null ||
                      O === void 0 ||
                      O.insertBefore(this._canvas, this._viewportElement);
                  let L = this._canvas.getContext("2d");
                  if (!L) throw Error("Ctx cannot be null");
                  (this._ctx = L),
                    this._registerDecorationListeners(),
                    this._registerBufferChangeListeners(),
                    this._registerDimensionChangeListeners(),
                    this.register(
                      (0, X.toDisposable)(() => {
                        var b;
                        (b = this._canvas) === null ||
                          b === void 0 ||
                          b.remove();
                      })
                    );
                }
                _registerDecorationListeners() {
                  this.register(
                    this._decorationService.onDecorationRegistered(() =>
                      this._queueRefresh(void 0, !0)
                    )
                  ),
                    this.register(
                      this._decorationService.onDecorationRemoved(() =>
                        this._queueRefresh(void 0, !0)
                      )
                    );
                }
                _registerBufferChangeListeners() {
                  this.register(
                    this._renderService.onRenderedViewportChange(() =>
                      this._queueRefresh()
                    )
                  ),
                    this.register(
                      this._bufferService.buffers.onBufferActivate(() => {
                        this._canvas.style.display =
                          this._bufferService.buffer ===
                          this._bufferService.buffers.alt
                            ? "none"
                            : "block";
                      })
                    ),
                    this.register(
                      this._bufferService.onScroll(() => {
                        this._lastKnownBufferLength !==
                          this._bufferService.buffers.normal.lines.length &&
                          (this._refreshDrawHeightConstants(),
                          this._refreshColorZonePadding());
                      })
                    );
                }
                _registerDimensionChangeListeners() {
                  this.register(
                    this._renderService.onRender(() => {
                      (this._containerHeight &&
                        this._containerHeight ===
                          this._screenElement.clientHeight) ||
                        (this._queueRefresh(!0),
                        (this._containerHeight =
                          this._screenElement.clientHeight));
                    })
                  ),
                    this.register(
                      this._optionsService.onSpecificOptionChange(
                        "overviewRulerWidth",
                        () => this._queueRefresh(!0)
                      )
                    ),
                    this.register(
                      (0, J.addDisposableDomListener)(
                        this._coreBrowseService.window,
                        "resize",
                        () => this._queueRefresh(!0)
                      )
                    ),
                    this._queueRefresh(!0);
                }
                _refreshDrawConstants() {
                  let F = Math.floor(this._canvas.width / 3),
                    j = Math.ceil(this._canvas.width / 3);
                  (W.full = this._canvas.width),
                    (W.left = F),
                    (W.center = j),
                    (W.right = F),
                    this._refreshDrawHeightConstants(),
                    (Z.full = 0),
                    (Z.left = 0),
                    (Z.center = W.left),
                    (Z.right = W.left + W.center);
                }
                _refreshDrawHeightConstants() {
                  Q.full = Math.round(2 * this._coreBrowseService.dpr);
                  let F =
                      this._canvas.height /
                      this._bufferService.buffer.lines.length,
                    j = Math.round(
                      Math.max(Math.min(F, 12), 6) * this._coreBrowseService.dpr
                    );
                  (Q.left = j), (Q.center = j), (Q.right = j);
                }
                _refreshColorZonePadding() {
                  this._colorZoneStore.setPadding({
                    full: Math.floor(
                      (this._bufferService.buffers.active.lines.length /
                        (this._canvas.height - 1)) *
                        Q.full
                    ),
                    left: Math.floor(
                      (this._bufferService.buffers.active.lines.length /
                        (this._canvas.height - 1)) *
                        Q.left
                    ),
                    center: Math.floor(
                      (this._bufferService.buffers.active.lines.length /
                        (this._canvas.height - 1)) *
                        Q.center
                    ),
                    right: Math.floor(
                      (this._bufferService.buffers.active.lines.length /
                        (this._canvas.height - 1)) *
                        Q.right
                    ),
                  }),
                    (this._lastKnownBufferLength =
                      this._bufferService.buffers.normal.lines.length);
                }
                _refreshCanvasDimensions() {
                  (this._canvas.style.width = `${this._width}px`),
                    (this._canvas.width = Math.round(
                      this._width * this._coreBrowseService.dpr
                    )),
                    (this._canvas.style.height = `${this._screenElement.clientHeight}px`),
                    (this._canvas.height = Math.round(
                      this._screenElement.clientHeight *
                        this._coreBrowseService.dpr
                    )),
                    this._refreshDrawConstants(),
                    this._refreshColorZonePadding();
                }
                _refreshDecorations() {
                  this._shouldUpdateDimensions &&
                    this._refreshCanvasDimensions(),
                    this._ctx.clearRect(
                      0,
                      0,
                      this._canvas.width,
                      this._canvas.height
                    ),
                    this._colorZoneStore.clear();
                  for (let j of this._decorationService.decorations)
                    this._colorZoneStore.addDecoration(j);
                  this._ctx.lineWidth = 1;
                  let F = this._colorZoneStore.zones;
                  for (let j of F)
                    j.position !== "full" && this._renderColorZone(j);
                  for (let j of F)
                    j.position === "full" && this._renderColorZone(j);
                  (this._shouldUpdateDimensions = !1),
                    (this._shouldUpdateAnchor = !1);
                }
                _renderColorZone(F) {
                  (this._ctx.fillStyle = F.color),
                    this._ctx.fillRect(
                      Z[F.position || "full"],
                      Math.round(
                        (this._canvas.height - 1) *
                          (F.startBufferLine /
                            this._bufferService.buffers.active.lines.length) -
                          Q[F.position || "full"] / 2
                      ),
                      W[F.position || "full"],
                      Math.round(
                        (this._canvas.height - 1) *
                          ((F.endBufferLine - F.startBufferLine) /
                            this._bufferService.buffers.active.lines.length) +
                          Q[F.position || "full"]
                      )
                    );
                }
                _queueRefresh(F, j) {
                  (this._shouldUpdateDimensions =
                    F || this._shouldUpdateDimensions),
                    (this._shouldUpdateAnchor = j || this._shouldUpdateAnchor),
                    this._animationFrame === void 0 &&
                      (this._animationFrame =
                        this._coreBrowseService.window.requestAnimationFrame(
                          () => {
                            this._refreshDecorations(),
                              (this._animationFrame = void 0);
                          }
                        ));
                }
              });
            H.OverviewRulerRenderer = Y = P(
              [
                V(2, G.IBufferService),
                V(3, G.IDecorationService),
                V(4, N.IRenderService),
                V(5, G.IOptionsService),
                V(6, N.ICoreBrowserService),
              ],
              Y
            );
          },
          2950: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (G, Q, W, Z) {
                  var Y,
                    F = arguments.length,
                    j =
                      F < 3
                        ? Q
                        : Z === null
                          ? (Z = Object.getOwnPropertyDescriptor(Q, W))
                          : Z;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    j = Reflect.decorate(G, Q, W, Z);
                  else
                    for (var $ = G.length - 1; $ >= 0; $--)
                      (Y = G[$]) &&
                        (j =
                          (F < 3 ? Y(j) : F > 3 ? Y(Q, W, j) : Y(Q, W)) || j);
                  return F > 3 && j && Object.defineProperty(Q, W, j), j;
                },
              V =
                (this && this.__param) ||
                function (G, Q) {
                  return function (W, Z) {
                    Q(W, Z, G);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.CompositionHelper = void 0);
            let q = K(4725),
              J = K(2585),
              N = K(2584),
              X = (H.CompositionHelper = class {
                get isComposing() {
                  return this._isComposing;
                }
                constructor(G, Q, W, Z, Y, F) {
                  (this._textarea = G),
                    (this._compositionView = Q),
                    (this._bufferService = W),
                    (this._optionsService = Z),
                    (this._coreService = Y),
                    (this._renderService = F),
                    (this._isComposing = !1),
                    (this._isSendingComposition = !1),
                    (this._compositionPosition = { start: 0, end: 0 }),
                    (this._dataAlreadySent = "");
                }
                compositionstart() {
                  (this._isComposing = !0),
                    (this._compositionPosition.start =
                      this._textarea.value.length),
                    (this._compositionView.textContent = ""),
                    (this._dataAlreadySent = ""),
                    this._compositionView.classList.add("active");
                }
                compositionupdate(G) {
                  (this._compositionView.textContent = G.data),
                    this.updateCompositionElements(),
                    setTimeout(() => {
                      this._compositionPosition.end =
                        this._textarea.value.length;
                    }, 0);
                }
                compositionend() {
                  this._finalizeComposition(!0);
                }
                keydown(G) {
                  if (this._isComposing || this._isSendingComposition) {
                    if (G.keyCode === 229) return !1;
                    if (
                      G.keyCode === 16 ||
                      G.keyCode === 17 ||
                      G.keyCode === 18
                    )
                      return !1;
                    this._finalizeComposition(!1);
                  }
                  return (
                    G.keyCode !== 229 || (this._handleAnyTextareaChanges(), !1)
                  );
                }
                _finalizeComposition(G) {
                  if (
                    (this._compositionView.classList.remove("active"),
                    (this._isComposing = !1),
                    G)
                  ) {
                    let Q = {
                      start: this._compositionPosition.start,
                      end: this._compositionPosition.end,
                    };
                    (this._isSendingComposition = !0),
                      setTimeout(() => {
                        if (this._isSendingComposition) {
                          let W;
                          (this._isSendingComposition = !1),
                            (Q.start += this._dataAlreadySent.length),
                            (W = this._isComposing
                              ? this._textarea.value.substring(Q.start, Q.end)
                              : this._textarea.value.substring(Q.start)),
                            W.length > 0 &&
                              this._coreService.triggerDataEvent(W, !0);
                        }
                      }, 0);
                  } else {
                    this._isSendingComposition = !1;
                    let Q = this._textarea.value.substring(
                      this._compositionPosition.start,
                      this._compositionPosition.end
                    );
                    this._coreService.triggerDataEvent(Q, !0);
                  }
                }
                _handleAnyTextareaChanges() {
                  let G = this._textarea.value;
                  setTimeout(() => {
                    if (!this._isComposing) {
                      let Q = this._textarea.value,
                        W = Q.replace(G, "");
                      (this._dataAlreadySent = W),
                        Q.length > G.length
                          ? this._coreService.triggerDataEvent(W, !0)
                          : Q.length < G.length
                            ? this._coreService.triggerDataEvent(
                                `${N.C0.DEL}`,
                                !0
                              )
                            : Q.length === G.length &&
                              Q !== G &&
                              this._coreService.triggerDataEvent(Q, !0);
                    }
                  }, 0);
                }
                updateCompositionElements(G) {
                  if (this._isComposing) {
                    if (this._bufferService.buffer.isCursorInViewport) {
                      let Q = Math.min(
                          this._bufferService.buffer.x,
                          this._bufferService.cols - 1
                        ),
                        W = this._renderService.dimensions.css.cell.height,
                        Z =
                          this._bufferService.buffer.y *
                          this._renderService.dimensions.css.cell.height,
                        Y = Q * this._renderService.dimensions.css.cell.width;
                      (this._compositionView.style.left = Y + "px"),
                        (this._compositionView.style.top = Z + "px"),
                        (this._compositionView.style.height = W + "px"),
                        (this._compositionView.style.lineHeight = W + "px"),
                        (this._compositionView.style.fontFamily =
                          this._optionsService.rawOptions.fontFamily),
                        (this._compositionView.style.fontSize =
                          this._optionsService.rawOptions.fontSize + "px");
                      let F = this._compositionView.getBoundingClientRect();
                      (this._textarea.style.left = Y + "px"),
                        (this._textarea.style.top = Z + "px"),
                        (this._textarea.style.width =
                          Math.max(F.width, 1) + "px"),
                        (this._textarea.style.height =
                          Math.max(F.height, 1) + "px"),
                        (this._textarea.style.lineHeight = F.height + "px");
                    }
                    G ||
                      setTimeout(() => this.updateCompositionElements(!0), 0);
                  }
                }
              });
            H.CompositionHelper = X = P(
              [
                V(2, J.IBufferService),
                V(3, J.IOptionsService),
                V(4, J.ICoreService),
                V(5, q.IRenderService),
              ],
              X
            );
          },
          9806: (M, H) => {
            function K(P, V, q) {
              let J = q.getBoundingClientRect(),
                N = P.getComputedStyle(q),
                X = parseInt(N.getPropertyValue("padding-left")),
                G = parseInt(N.getPropertyValue("padding-top"));
              return [V.clientX - J.left - X, V.clientY - J.top - G];
            }
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.getCoords = H.getCoordsRelativeToElement = void 0),
              (H.getCoordsRelativeToElement = K),
              (H.getCoords = function (P, V, q, J, N, X, G, Q, W) {
                if (!X) return;
                let Z = K(P, V, q);
                return Z
                  ? ((Z[0] = Math.ceil((Z[0] + (W ? G / 2 : 0)) / G)),
                    (Z[1] = Math.ceil(Z[1] / Q)),
                    (Z[0] = Math.min(Math.max(Z[0], 1), J + (W ? 1 : 0))),
                    (Z[1] = Math.min(Math.max(Z[1], 1), N)),
                    Z)
                  : void 0;
              });
          },
          9504: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.moveToCellSequence = void 0);
            let P = K(2584);
            function V(Q, W, Z, Y) {
              let F = Q - q(Q, Z),
                j = W - q(W, Z),
                $ =
                  Math.abs(F - j) -
                  (function (E, U, z) {
                    let k = 0,
                      O = E - q(E, z),
                      L = U - q(U, z);
                    for (let b = 0; b < Math.abs(O - L); b++) {
                      let B = J(E, U) === "A" ? -1 : 1,
                        S = z.buffer.lines.get(O + B * b);
                      (S == null ? void 0 : S.isWrapped) && k++;
                    }
                    return k;
                  })(Q, W, Z);
              return G($, X(J(Q, W), Y));
            }
            function q(Q, W) {
              let Z = 0,
                Y = W.buffer.lines.get(Q),
                F = Y == null ? void 0 : Y.isWrapped;
              for (; F && Q >= 0 && Q < W.rows; )
                Z++,
                  (Y = W.buffer.lines.get(--Q)),
                  (F = Y == null ? void 0 : Y.isWrapped);
              return Z;
            }
            function J(Q, W) {
              return Q > W ? "A" : "B";
            }
            function N(Q, W, Z, Y, F, j) {
              let $ = Q,
                E = W,
                U = "";
              for (; $ !== Z || E !== Y; )
                ($ += F ? 1 : -1),
                  F && $ > j.cols - 1
                    ? ((U += j.buffer.translateBufferLineToString(E, !1, Q, $)),
                      ($ = 0),
                      (Q = 0),
                      E++)
                    : !F &&
                      $ < 0 &&
                      ((U += j.buffer.translateBufferLineToString(
                        E,
                        !1,
                        0,
                        Q + 1
                      )),
                      ($ = j.cols - 1),
                      (Q = $),
                      E--);
              return U + j.buffer.translateBufferLineToString(E, !1, Q, $);
            }
            function X(Q, W) {
              let Z = W ? "O" : "[";
              return P.C0.ESC + Z + Q;
            }
            function G(Q, W) {
              Q = Math.floor(Q);
              let Z = "";
              for (let Y = 0; Y < Q; Y++) Z += W;
              return Z;
            }
            H.moveToCellSequence = function (Q, W, Z, Y) {
              let F = Z.buffer.x,
                j = Z.buffer.y;
              if (!Z.buffer.hasScrollback)
                return (
                  (function (U, z, k, O, L, b) {
                    return V(z, O, L, b).length === 0
                      ? ""
                      : G(N(U, z, U, z - q(z, L), !1, L).length, X("D", b));
                  })(F, j, 0, W, Z, Y) +
                  V(j, W, Z, Y) +
                  (function (U, z, k, O, L, b) {
                    let B;
                    B = V(z, O, L, b).length > 0 ? O - q(O, L) : z;
                    let S = O,
                      I = (function (R, D, y, A, v, m) {
                        let p;
                        return (
                          (p = V(y, A, v, m).length > 0 ? A - q(A, v) : D),
                          (R < y && p <= A) || (R >= y && p < A) ? "C" : "D"
                        );
                      })(U, z, k, O, L, b);
                    return G(N(U, B, k, S, I === "C", L).length, X(I, b));
                  })(F, j, Q, W, Z, Y)
                );
              let $;
              if (j === W)
                return ($ = F > Q ? "D" : "C"), G(Math.abs(F - Q), X($, Y));
              $ = j > W ? "D" : "C";
              let E = Math.abs(j - W);
              return G(
                (function (U, z) {
                  return z.cols - U;
                })(j > W ? Q : F, Z) +
                  (E - 1) * Z.cols +
                  1 +
                  ((j > W ? F : Q) - 1),
                X($, Y)
              );
            };
          },
          1296: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (L, b, B, S) {
                  var I,
                    R = arguments.length,
                    D =
                      R < 3
                        ? b
                        : S === null
                          ? (S = Object.getOwnPropertyDescriptor(b, B))
                          : S;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    D = Reflect.decorate(L, b, B, S);
                  else
                    for (var y = L.length - 1; y >= 0; y--)
                      (I = L[y]) &&
                        (D =
                          (R < 3 ? I(D) : R > 3 ? I(b, B, D) : I(b, B)) || D);
                  return R > 3 && D && Object.defineProperty(b, B, D), D;
                },
              V =
                (this && this.__param) ||
                function (L, b) {
                  return function (B, S) {
                    b(B, S, L);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.DomRenderer = void 0);
            let q = K(3787),
              J = K(2550),
              N = K(2223),
              X = K(6171),
              G = K(4725),
              Q = K(8055),
              W = K(8460),
              Z = K(844),
              Y = K(2585),
              F = "xterm-dom-renderer-owner-",
              j = "xterm-rows",
              $ = "xterm-fg-",
              E = "xterm-bg-",
              U = "xterm-focus",
              z = "xterm-selection",
              k = 1,
              O = (H.DomRenderer = class extends Z.Disposable {
                constructor(L, b, B, S, I, R, D, y, A, v) {
                  super(),
                    (this._element = L),
                    (this._screenElement = b),
                    (this._viewportElement = B),
                    (this._linkifier2 = S),
                    (this._charSizeService = R),
                    (this._optionsService = D),
                    (this._bufferService = y),
                    (this._coreBrowserService = A),
                    (this._themeService = v),
                    (this._terminalClass = k++),
                    (this._rowElements = []),
                    (this.onRequestRedraw = this.register(
                      new W.EventEmitter()
                    ).event),
                    (this._rowContainer = document.createElement("div")),
                    this._rowContainer.classList.add(j),
                    (this._rowContainer.style.lineHeight = "normal"),
                    this._rowContainer.setAttribute("aria-hidden", "true"),
                    this._refreshRowElements(
                      this._bufferService.cols,
                      this._bufferService.rows
                    ),
                    (this._selectionContainer = document.createElement("div")),
                    this._selectionContainer.classList.add(z),
                    this._selectionContainer.setAttribute(
                      "aria-hidden",
                      "true"
                    ),
                    (this.dimensions = (0, X.createRenderDimensions)()),
                    this._updateDimensions(),
                    this.register(
                      this._optionsService.onOptionChange(() =>
                        this._handleOptionsChanged()
                      )
                    ),
                    this.register(
                      this._themeService.onChangeColors((m) =>
                        this._injectCss(m)
                      )
                    ),
                    this._injectCss(this._themeService.colors),
                    (this._rowFactory = I.createInstance(
                      q.DomRendererRowFactory,
                      document
                    )),
                    this._element.classList.add(F + this._terminalClass),
                    this._screenElement.appendChild(this._rowContainer),
                    this._screenElement.appendChild(this._selectionContainer),
                    this.register(
                      this._linkifier2.onShowLinkUnderline((m) =>
                        this._handleLinkHover(m)
                      )
                    ),
                    this.register(
                      this._linkifier2.onHideLinkUnderline((m) =>
                        this._handleLinkLeave(m)
                      )
                    ),
                    this.register(
                      (0, Z.toDisposable)(() => {
                        this._element.classList.remove(F + this._terminalClass),
                          this._rowContainer.remove(),
                          this._selectionContainer.remove(),
                          this._widthCache.dispose(),
                          this._themeStyleElement.remove(),
                          this._dimensionsStyleElement.remove();
                      })
                    ),
                    (this._widthCache = new J.WidthCache(document)),
                    this._widthCache.setFont(
                      this._optionsService.rawOptions.fontFamily,
                      this._optionsService.rawOptions.fontSize,
                      this._optionsService.rawOptions.fontWeight,
                      this._optionsService.rawOptions.fontWeightBold
                    ),
                    this._setDefaultSpacing();
                }
                _updateDimensions() {
                  let L = this._coreBrowserService.dpr;
                  (this.dimensions.device.char.width =
                    this._charSizeService.width * L),
                    (this.dimensions.device.char.height = Math.ceil(
                      this._charSizeService.height * L
                    )),
                    (this.dimensions.device.cell.width =
                      this.dimensions.device.char.width +
                      Math.round(
                        this._optionsService.rawOptions.letterSpacing
                      )),
                    (this.dimensions.device.cell.height = Math.floor(
                      this.dimensions.device.char.height *
                        this._optionsService.rawOptions.lineHeight
                    )),
                    (this.dimensions.device.char.left = 0),
                    (this.dimensions.device.char.top = 0),
                    (this.dimensions.device.canvas.width =
                      this.dimensions.device.cell.width *
                      this._bufferService.cols),
                    (this.dimensions.device.canvas.height =
                      this.dimensions.device.cell.height *
                      this._bufferService.rows),
                    (this.dimensions.css.canvas.width = Math.round(
                      this.dimensions.device.canvas.width / L
                    )),
                    (this.dimensions.css.canvas.height = Math.round(
                      this.dimensions.device.canvas.height / L
                    )),
                    (this.dimensions.css.cell.width =
                      this.dimensions.css.canvas.width /
                      this._bufferService.cols),
                    (this.dimensions.css.cell.height =
                      this.dimensions.css.canvas.height /
                      this._bufferService.rows);
                  for (let B of this._rowElements)
                    (B.style.width = `${this.dimensions.css.canvas.width}px`),
                      (B.style.height = `${this.dimensions.css.cell.height}px`),
                      (B.style.lineHeight = `${this.dimensions.css.cell.height}px`),
                      (B.style.overflow = "hidden");
                  this._dimensionsStyleElement ||
                    ((this._dimensionsStyleElement =
                      document.createElement("style")),
                    this._screenElement.appendChild(
                      this._dimensionsStyleElement
                    ));
                  let b = `${this._terminalSelector} .${j} span { display: inline-block; height: 100%; vertical-align: top;}`;
                  (this._dimensionsStyleElement.textContent = b),
                    (this._selectionContainer.style.height =
                      this._viewportElement.style.height),
                    (this._screenElement.style.width = `${this.dimensions.css.canvas.width}px`),
                    (this._screenElement.style.height = `${this.dimensions.css.canvas.height}px`);
                }
                _injectCss(L) {
                  this._themeStyleElement ||
                    ((this._themeStyleElement =
                      document.createElement("style")),
                    this._screenElement.appendChild(this._themeStyleElement));
                  let b = `${this._terminalSelector} .${j} { color: ${L.foreground.css}; font-family: ${this._optionsService.rawOptions.fontFamily}; font-size: ${this._optionsService.rawOptions.fontSize}px; font-kerning: none; white-space: pre}`;
                  (b += `${this._terminalSelector} .${j} .xterm-dim { color: ${Q.color.multiplyOpacity(L.foreground, 0.5).css};}`),
                    (b += `${this._terminalSelector} span:not(.xterm-bold) { font-weight: ${this._optionsService.rawOptions.fontWeight};}${this._terminalSelector} span.xterm-bold { font-weight: ${this._optionsService.rawOptions.fontWeightBold};}${this._terminalSelector} span.xterm-italic { font-style: italic;}`),
                    (b +=
                      "@keyframes blink_box_shadow_" +
                      this._terminalClass +
                      " { 50% {  border-bottom-style: hidden; }}"),
                    (b +=
                      "@keyframes blink_block_" +
                      this._terminalClass +
                      ` { 0% {  background-color: ${L.cursor.css};  color: ${L.cursorAccent.css}; } 50% {  background-color: inherit;  color: ${L.cursor.css}; }}`),
                    (b +=
                      `${this._terminalSelector} .${j}.${U} .xterm-cursor.xterm-cursor-blink:not(.xterm-cursor-block) { animation: blink_box_shadow_` +
                      this._terminalClass +
                      ` 1s step-end infinite;}${this._terminalSelector} .${j}.${U} .xterm-cursor.xterm-cursor-blink.xterm-cursor-block { animation: blink_block_` +
                      this._terminalClass +
                      ` 1s step-end infinite;}${this._terminalSelector} .${j} .xterm-cursor.xterm-cursor-block { background-color: ${L.cursor.css}; color: ${L.cursorAccent.css};}${this._terminalSelector} .${j} .xterm-cursor.xterm-cursor-outline { outline: 1px solid ${L.cursor.css}; outline-offset: -1px;}${this._terminalSelector} .${j} .xterm-cursor.xterm-cursor-bar { box-shadow: ${this._optionsService.rawOptions.cursorWidth}px 0 0 ${L.cursor.css} inset;}${this._terminalSelector} .${j} .xterm-cursor.xterm-cursor-underline { border-bottom: 1px ${L.cursor.css}; border-bottom-style: solid; height: calc(100% - 1px);}`),
                    (b += `${this._terminalSelector} .${z} { position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none;}${this._terminalSelector}.focus .${z} div { position: absolute; background-color: ${L.selectionBackgroundOpaque.css};}${this._terminalSelector} .${z} div { position: absolute; background-color: ${L.selectionInactiveBackgroundOpaque.css};}`);
                  for (let [B, S] of L.ansi.entries())
                    b += `${this._terminalSelector} .${$}${B} { color: ${S.css}; }${this._terminalSelector} .${$}${B}.xterm-dim { color: ${Q.color.multiplyOpacity(S, 0.5).css}; }${this._terminalSelector} .${E}${B} { background-color: ${S.css}; }`;
                  (b += `${this._terminalSelector} .${$}${N.INVERTED_DEFAULT_COLOR} { color: ${Q.color.opaque(L.background).css}; }${this._terminalSelector} .${$}${N.INVERTED_DEFAULT_COLOR}.xterm-dim { color: ${Q.color.multiplyOpacity(Q.color.opaque(L.background), 0.5).css}; }${this._terminalSelector} .${E}${N.INVERTED_DEFAULT_COLOR} { background-color: ${L.foreground.css}; }`),
                    (this._themeStyleElement.textContent = b);
                }
                _setDefaultSpacing() {
                  let L =
                    this.dimensions.css.cell.width -
                    this._widthCache.get("W", !1, !1);
                  (this._rowContainer.style.letterSpacing = `${L}px`),
                    (this._rowFactory.defaultSpacing = L);
                }
                handleDevicePixelRatioChange() {
                  this._updateDimensions(),
                    this._widthCache.clear(),
                    this._setDefaultSpacing();
                }
                _refreshRowElements(L, b) {
                  for (let B = this._rowElements.length; B <= b; B++) {
                    let S = document.createElement("div");
                    this._rowContainer.appendChild(S),
                      this._rowElements.push(S);
                  }
                  for (; this._rowElements.length > b; )
                    this._rowContainer.removeChild(this._rowElements.pop());
                }
                handleResize(L, b) {
                  this._refreshRowElements(L, b), this._updateDimensions();
                }
                handleCharSizeChanged() {
                  this._updateDimensions(),
                    this._widthCache.clear(),
                    this._setDefaultSpacing();
                }
                handleBlur() {
                  this._rowContainer.classList.remove(U);
                }
                handleFocus() {
                  this._rowContainer.classList.add(U),
                    this.renderRows(
                      this._bufferService.buffer.y,
                      this._bufferService.buffer.y
                    );
                }
                handleSelectionChanged(L, b, B) {
                  if (
                    (this._selectionContainer.replaceChildren(),
                    this._rowFactory.handleSelectionChanged(L, b, B),
                    this.renderRows(0, this._bufferService.rows - 1),
                    !L || !b)
                  )
                    return;
                  let S = L[1] - this._bufferService.buffer.ydisp,
                    I = b[1] - this._bufferService.buffer.ydisp,
                    R = Math.max(S, 0),
                    D = Math.min(I, this._bufferService.rows - 1);
                  if (R >= this._bufferService.rows || D < 0) return;
                  let y = document.createDocumentFragment();
                  if (B) {
                    let A = L[0] > b[0];
                    y.appendChild(
                      this._createSelectionElement(
                        R,
                        A ? b[0] : L[0],
                        A ? L[0] : b[0],
                        D - R + 1
                      )
                    );
                  } else {
                    let A = S === R ? L[0] : 0,
                      v = R === I ? b[0] : this._bufferService.cols;
                    y.appendChild(this._createSelectionElement(R, A, v));
                    let m = D - R - 1;
                    if (
                      (y.appendChild(
                        this._createSelectionElement(
                          R + 1,
                          0,
                          this._bufferService.cols,
                          m
                        )
                      ),
                      R !== D)
                    ) {
                      let p = I === D ? b[0] : this._bufferService.cols;
                      y.appendChild(this._createSelectionElement(D, 0, p));
                    }
                  }
                  this._selectionContainer.appendChild(y);
                }
                _createSelectionElement(L, b, B, S = 1) {
                  let I = document.createElement("div");
                  return (
                    (I.style.height =
                      S * this.dimensions.css.cell.height + "px"),
                    (I.style.top = L * this.dimensions.css.cell.height + "px"),
                    (I.style.left = b * this.dimensions.css.cell.width + "px"),
                    (I.style.width =
                      this.dimensions.css.cell.width * (B - b) + "px"),
                    I
                  );
                }
                handleCursorMove() {}
                _handleOptionsChanged() {
                  this._updateDimensions(),
                    this._injectCss(this._themeService.colors),
                    this._widthCache.setFont(
                      this._optionsService.rawOptions.fontFamily,
                      this._optionsService.rawOptions.fontSize,
                      this._optionsService.rawOptions.fontWeight,
                      this._optionsService.rawOptions.fontWeightBold
                    ),
                    this._setDefaultSpacing();
                }
                clear() {
                  for (let L of this._rowElements) L.replaceChildren();
                }
                renderRows(L, b) {
                  let B = this._bufferService.buffer,
                    S = B.ybase + B.y,
                    I = Math.min(B.x, this._bufferService.cols - 1),
                    R = this._optionsService.rawOptions.cursorBlink,
                    D = this._optionsService.rawOptions.cursorStyle,
                    y = this._optionsService.rawOptions.cursorInactiveStyle;
                  for (let A = L; A <= b; A++) {
                    let v = A + B.ydisp,
                      m = this._rowElements[A],
                      p = B.lines.get(v);
                    if (!m || !p) break;
                    m.replaceChildren(
                      ...this._rowFactory.createRow(
                        p,
                        v,
                        v === S,
                        D,
                        y,
                        I,
                        R,
                        this.dimensions.css.cell.width,
                        this._widthCache,
                        -1,
                        -1
                      )
                    );
                  }
                }
                get _terminalSelector() {
                  return `.${F}${this._terminalClass}`;
                }
                _handleLinkHover(L) {
                  this._setCellUnderline(L.x1, L.x2, L.y1, L.y2, L.cols, !0);
                }
                _handleLinkLeave(L) {
                  this._setCellUnderline(L.x1, L.x2, L.y1, L.y2, L.cols, !1);
                }
                _setCellUnderline(L, b, B, S, I, R) {
                  B < 0 && (L = 0), S < 0 && (b = 0);
                  let D = this._bufferService.rows - 1;
                  (B = Math.max(Math.min(B, D), 0)),
                    (S = Math.max(Math.min(S, D), 0)),
                    (I = Math.min(I, this._bufferService.cols));
                  let y = this._bufferService.buffer,
                    A = y.ybase + y.y,
                    v = Math.min(y.x, I - 1),
                    m = this._optionsService.rawOptions.cursorBlink,
                    p = this._optionsService.rawOptions.cursorStyle,
                    f = this._optionsService.rawOptions.cursorInactiveStyle;
                  for (let d = B; d <= S; ++d) {
                    let T = d + y.ydisp,
                      x = this._rowElements[d],
                      C = y.lines.get(T);
                    if (!x || !C) break;
                    x.replaceChildren(
                      ...this._rowFactory.createRow(
                        C,
                        T,
                        T === A,
                        p,
                        f,
                        v,
                        m,
                        this.dimensions.css.cell.width,
                        this._widthCache,
                        R ? (d === B ? L : 0) : -1,
                        R ? (d === S ? b : I) - 1 : -1
                      )
                    );
                  }
                }
              });
            H.DomRenderer = O = P(
              [
                V(4, Y.IInstantiationService),
                V(5, G.ICharSizeService),
                V(6, Y.IOptionsService),
                V(7, Y.IBufferService),
                V(8, G.ICoreBrowserService),
                V(9, G.IThemeService),
              ],
              O
            );
          },
          3787: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function ($, E, U, z) {
                  var k,
                    O = arguments.length,
                    L =
                      O < 3
                        ? E
                        : z === null
                          ? (z = Object.getOwnPropertyDescriptor(E, U))
                          : z;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    L = Reflect.decorate($, E, U, z);
                  else
                    for (var b = $.length - 1; b >= 0; b--)
                      (k = $[b]) &&
                        (L =
                          (O < 3 ? k(L) : O > 3 ? k(E, U, L) : k(E, U)) || L);
                  return O > 3 && L && Object.defineProperty(E, U, L), L;
                },
              V =
                (this && this.__param) ||
                function ($, E) {
                  return function (U, z) {
                    E(U, z, $);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.DomRendererRowFactory = void 0);
            let q = K(2223),
              J = K(643),
              N = K(511),
              X = K(2585),
              G = K(8055),
              Q = K(4725),
              W = K(4269),
              Z = K(6171),
              Y = K(3734),
              F = (H.DomRendererRowFactory = class {
                constructor($, E, U, z, k, O, L) {
                  (this._document = $),
                    (this._characterJoinerService = E),
                    (this._optionsService = U),
                    (this._coreBrowserService = z),
                    (this._coreService = k),
                    (this._decorationService = O),
                    (this._themeService = L),
                    (this._workCell = new N.CellData()),
                    (this._columnSelectMode = !1),
                    (this.defaultSpacing = 0);
                }
                handleSelectionChanged($, E, U) {
                  (this._selectionStart = $),
                    (this._selectionEnd = E),
                    (this._columnSelectMode = U);
                }
                createRow($, E, U, z, k, O, L, b, B, S, I) {
                  let R = [],
                    D = this._characterJoinerService.getJoinedCharacters(E),
                    y = this._themeService.colors,
                    A,
                    v = $.getNoBgTrimmedLength();
                  U && v < O + 1 && (v = O + 1);
                  let m = 0,
                    p = "",
                    f = 0,
                    d = 0,
                    T = 0,
                    x = !1,
                    C = 0,
                    g = !1,
                    a = 0,
                    w = [],
                    r = S !== -1 && I !== -1;
                  for (let h = 0; h < v; h++) {
                    $.loadCell(h, this._workCell);
                    let s = this._workCell.getWidth();
                    if (s === 0) continue;
                    let qQ = !1,
                      jQ = h,
                      l = this._workCell;
                    if (D.length > 0 && h === D[0][0]) {
                      qQ = !0;
                      let o = D.shift();
                      (l = new W.JoinedCellData(
                        this._workCell,
                        $.translateToString(!0, o[0], o[1]),
                        o[1] - o[0]
                      )),
                        (jQ = o[1] - 1),
                        (s = l.getWidth());
                    }
                    let GQ = this._isCellInSelection(h, E),
                      $Q = U && h === O,
                      zQ = r && h >= S && h <= I,
                      EQ = !1;
                    this._decorationService.forEachDecorationAtCell(
                      h,
                      E,
                      void 0,
                      (o) => {
                        EQ = !0;
                      }
                    );
                    let KQ = l.getChars() || J.WHITESPACE_CELL_CHAR;
                    if (
                      (KQ === " " &&
                        (l.isUnderline() || l.isOverline()) &&
                        (KQ = " "),
                      (a = s * b - B.get(KQ, l.isBold(), l.isItalic())),
                      A)
                    ) {
                      if (
                        m &&
                        ((GQ && g) || (!GQ && !g && l.bg === f)) &&
                        ((GQ && g && y.selectionForeground) || l.fg === d) &&
                        l.extended.ext === T &&
                        zQ === x &&
                        a === C &&
                        !$Q &&
                        !qQ &&
                        !EQ
                      ) {
                        (p += KQ), m++;
                        continue;
                      }
                      m && (A.textContent = p),
                        (A = this._document.createElement("span")),
                        (m = 0),
                        (p = "");
                    } else A = this._document.createElement("span");
                    if (
                      ((f = l.bg),
                      (d = l.fg),
                      (T = l.extended.ext),
                      (x = zQ),
                      (C = a),
                      (g = GQ),
                      qQ && O >= h && O <= jQ && (O = h),
                      !this._coreService.isCursorHidden && $Q)
                    ) {
                      if (
                        (w.push("xterm-cursor"),
                        this._coreBrowserService.isFocused)
                      )
                        L && w.push("xterm-cursor-blink"),
                          w.push(
                            z === "bar"
                              ? "xterm-cursor-bar"
                              : z === "underline"
                                ? "xterm-cursor-underline"
                                : "xterm-cursor-block"
                          );
                      else if (k)
                        switch (k) {
                          case "outline":
                            w.push("xterm-cursor-outline");
                            break;
                          case "block":
                            w.push("xterm-cursor-block");
                            break;
                          case "bar":
                            w.push("xterm-cursor-bar");
                            break;
                          case "underline":
                            w.push("xterm-cursor-underline");
                        }
                    }
                    if (
                      (l.isBold() && w.push("xterm-bold"),
                      l.isItalic() && w.push("xterm-italic"),
                      l.isDim() && w.push("xterm-dim"),
                      (p = l.isInvisible()
                        ? J.WHITESPACE_CELL_CHAR
                        : l.getChars() || J.WHITESPACE_CELL_CHAR),
                      l.isUnderline() &&
                        (w.push(`xterm-underline-${l.extended.underlineStyle}`),
                        p === " " && (p = " "),
                        !l.isUnderlineColorDefault()))
                    )
                      if (l.isUnderlineColorRGB())
                        A.style.textDecorationColor = `rgb(${Y.AttributeData.toColorRGB(l.getUnderlineColor()).join(",")})`;
                      else {
                        let o = l.getUnderlineColor();
                        this._optionsService.rawOptions
                          .drawBoldTextInBrightColors &&
                          l.isBold() &&
                          o < 8 &&
                          (o += 8),
                          (A.style.textDecorationColor = y.ansi[o].css);
                      }
                    l.isOverline() &&
                      (w.push("xterm-overline"), p === " " && (p = " ")),
                      l.isStrikethrough() && w.push("xterm-strikethrough"),
                      zQ && (A.style.textDecoration = "underline");
                    let i = l.getFgColor(),
                      WQ = l.getFgColorMode(),
                      QQ = l.getBgColor(),
                      HQ = l.getBgColorMode(),
                      RQ = !!l.isInverse();
                    if (RQ) {
                      let o = i;
                      (i = QQ), (QQ = o);
                      let dQ = WQ;
                      (WQ = HQ), (HQ = dQ);
                    }
                    let ZQ,
                      TQ,
                      YQ,
                      JQ = !1;
                    switch (
                      (this._decorationService.forEachDecorationAtCell(
                        h,
                        E,
                        void 0,
                        (o) => {
                          (o.options.layer !== "top" && JQ) ||
                            (o.backgroundColorRGB &&
                              ((HQ = 50331648),
                              (QQ =
                                (o.backgroundColorRGB.rgba >> 8) & 16777215),
                              (ZQ = o.backgroundColorRGB)),
                            o.foregroundColorRGB &&
                              ((WQ = 50331648),
                              (i = (o.foregroundColorRGB.rgba >> 8) & 16777215),
                              (TQ = o.foregroundColorRGB)),
                            (JQ = o.options.layer === "top"));
                        }
                      ),
                      !JQ &&
                        GQ &&
                        ((ZQ = this._coreBrowserService.isFocused
                          ? y.selectionBackgroundOpaque
                          : y.selectionInactiveBackgroundOpaque),
                        (QQ = (ZQ.rgba >> 8) & 16777215),
                        (HQ = 50331648),
                        (JQ = !0),
                        y.selectionForeground &&
                          ((WQ = 50331648),
                          (i = (y.selectionForeground.rgba >> 8) & 16777215),
                          (TQ = y.selectionForeground))),
                      JQ && w.push("xterm-decoration-top"),
                      HQ)
                    ) {
                      case 16777216:
                      case 33554432:
                        (YQ = y.ansi[QQ]), w.push(`xterm-bg-${QQ}`);
                        break;
                      case 50331648:
                        (YQ = G.rgba.toColor(
                          QQ >> 16,
                          (QQ >> 8) & 255,
                          255 & QQ
                        )),
                          this._addStyle(
                            A,
                            `background-color:#${j((QQ >>> 0).toString(16), "0", 6)}`
                          );
                        break;
                      default:
                        RQ
                          ? ((YQ = y.foreground),
                            w.push(`xterm-bg-${q.INVERTED_DEFAULT_COLOR}`))
                          : (YQ = y.background);
                    }
                    switch (
                      (ZQ ||
                        (l.isDim() && (ZQ = G.color.multiplyOpacity(YQ, 0.5))),
                      WQ)
                    ) {
                      case 16777216:
                      case 33554432:
                        l.isBold() &&
                          i < 8 &&
                          this._optionsService.rawOptions
                            .drawBoldTextInBrightColors &&
                          (i += 8),
                          this._applyMinimumContrast(
                            A,
                            YQ,
                            y.ansi[i],
                            l,
                            ZQ,
                            void 0
                          ) || w.push(`xterm-fg-${i}`);
                        break;
                      case 50331648:
                        let o = G.rgba.toColor(
                          (i >> 16) & 255,
                          (i >> 8) & 255,
                          255 & i
                        );
                        this._applyMinimumContrast(A, YQ, o, l, ZQ, TQ) ||
                          this._addStyle(
                            A,
                            `color:#${j(i.toString(16), "0", 6)}`
                          );
                        break;
                      default:
                        this._applyMinimumContrast(
                          A,
                          YQ,
                          y.foreground,
                          l,
                          ZQ,
                          void 0
                        ) ||
                          (RQ &&
                            w.push(`xterm-fg-${q.INVERTED_DEFAULT_COLOR}`));
                    }
                    w.length && ((A.className = w.join(" ")), (w.length = 0)),
                      $Q || qQ || EQ ? (A.textContent = p) : m++,
                      a !== this.defaultSpacing &&
                        (A.style.letterSpacing = `${a}px`),
                      R.push(A),
                      (h = jQ);
                  }
                  return A && m && (A.textContent = p), R;
                }
                _applyMinimumContrast($, E, U, z, k, O) {
                  if (
                    this._optionsService.rawOptions.minimumContrastRatio ===
                      1 ||
                    (0, Z.excludeFromContrastRatioDemands)(z.getCode())
                  )
                    return !1;
                  let L = this._getContrastCache(z),
                    b;
                  if (
                    (k || O || (b = L.getColor(E.rgba, U.rgba)), b === void 0)
                  ) {
                    let B =
                      this._optionsService.rawOptions.minimumContrastRatio /
                      (z.isDim() ? 2 : 1);
                    (b = G.color.ensureContrastRatio(k || E, O || U, B)),
                      L.setColor(
                        (k || E).rgba,
                        (O || U).rgba,
                        b != null ? b : null
                      );
                  }
                  return !!b && (this._addStyle($, `color:${b.css}`), !0);
                }
                _getContrastCache($) {
                  return $.isDim()
                    ? this._themeService.colors.halfContrastCache
                    : this._themeService.colors.contrastCache;
                }
                _addStyle($, E) {
                  $.setAttribute(
                    "style",
                    `${$.getAttribute("style") || ""}${E};`
                  );
                }
                _isCellInSelection($, E) {
                  let U = this._selectionStart,
                    z = this._selectionEnd;
                  return (
                    !(!U || !z) &&
                    (this._columnSelectMode
                      ? U[0] <= z[0]
                        ? $ >= U[0] && E >= U[1] && $ < z[0] && E <= z[1]
                        : $ < U[0] && E >= U[1] && $ >= z[0] && E <= z[1]
                      : (E > U[1] && E < z[1]) ||
                        (U[1] === z[1] &&
                          E === U[1] &&
                          $ >= U[0] &&
                          $ < z[0]) ||
                        (U[1] < z[1] && E === z[1] && $ < z[0]) ||
                        (U[1] < z[1] && E === U[1] && $ >= U[0]))
                  );
                }
              });
            function j($, E, U) {
              for (; $.length < U; ) $ = E + $;
              return $;
            }
            H.DomRendererRowFactory = F = P(
              [
                V(1, Q.ICharacterJoinerService),
                V(2, X.IOptionsService),
                V(3, Q.ICoreBrowserService),
                V(4, X.ICoreService),
                V(5, X.IDecorationService),
                V(6, Q.IThemeService),
              ],
              F
            );
          },
          2550: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.WidthCache = void 0),
              (H.WidthCache = class {
                constructor(K) {
                  (this._flat = new Float32Array(256)),
                    (this._font = ""),
                    (this._fontSize = 0),
                    (this._weight = "normal"),
                    (this._weightBold = "bold"),
                    (this._measureElements = []),
                    (this._container = K.createElement("div")),
                    (this._container.style.position = "absolute"),
                    (this._container.style.top = "-50000px"),
                    (this._container.style.width = "50000px"),
                    (this._container.style.whiteSpace = "pre"),
                    (this._container.style.fontKerning = "none");
                  let P = K.createElement("span"),
                    V = K.createElement("span");
                  V.style.fontWeight = "bold";
                  let q = K.createElement("span");
                  q.style.fontStyle = "italic";
                  let J = K.createElement("span");
                  (J.style.fontWeight = "bold"),
                    (J.style.fontStyle = "italic"),
                    (this._measureElements = [P, V, q, J]),
                    this._container.appendChild(P),
                    this._container.appendChild(V),
                    this._container.appendChild(q),
                    this._container.appendChild(J),
                    K.body.appendChild(this._container),
                    this.clear();
                }
                dispose() {
                  this._container.remove(),
                    (this._measureElements.length = 0),
                    (this._holey = void 0);
                }
                clear() {
                  this._flat.fill(-9999), (this._holey = new Map());
                }
                setFont(K, P, V, q) {
                  (K === this._font &&
                    P === this._fontSize &&
                    V === this._weight &&
                    q === this._weightBold) ||
                    ((this._font = K),
                    (this._fontSize = P),
                    (this._weight = V),
                    (this._weightBold = q),
                    (this._container.style.fontFamily = this._font),
                    (this._container.style.fontSize = `${this._fontSize}px`),
                    (this._measureElements[0].style.fontWeight = `${V}`),
                    (this._measureElements[1].style.fontWeight = `${q}`),
                    (this._measureElements[2].style.fontWeight = `${V}`),
                    (this._measureElements[3].style.fontWeight = `${q}`),
                    this.clear());
                }
                get(K, P, V) {
                  let q = 0;
                  if (!P && !V && K.length === 1 && (q = K.charCodeAt(0)) < 256)
                    return this._flat[q] !== -9999
                      ? this._flat[q]
                      : (this._flat[q] = this._measure(K, 0));
                  let J = K;
                  P && (J += "B"), V && (J += "I");
                  let N = this._holey.get(J);
                  if (N === void 0) {
                    let X = 0;
                    P && (X |= 1),
                      V && (X |= 2),
                      (N = this._measure(K, X)),
                      this._holey.set(J, N);
                  }
                  return N;
                }
                _measure(K, P) {
                  let V = this._measureElements[P];
                  return (V.textContent = K.repeat(32)), V.offsetWidth / 32;
                }
              });
          },
          2223: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.TEXT_BASELINE =
                H.DIM_OPACITY =
                H.INVERTED_DEFAULT_COLOR =
                  void 0);
            let P = K(6114);
            (H.INVERTED_DEFAULT_COLOR = 257),
              (H.DIM_OPACITY = 0.5),
              (H.TEXT_BASELINE =
                P.isFirefox || P.isLegacyEdge ? "bottom" : "ideographic");
          },
          6171: (M, H) => {
            function K(P) {
              return 57508 <= P && P <= 57558;
            }
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.createRenderDimensions =
                H.excludeFromContrastRatioDemands =
                H.isRestrictedPowerlineGlyph =
                H.isPowerlineGlyph =
                H.throwIfFalsy =
                  void 0),
              (H.throwIfFalsy = function (P) {
                if (!P) throw Error("value must not be falsy");
                return P;
              }),
              (H.isPowerlineGlyph = K),
              (H.isRestrictedPowerlineGlyph = function (P) {
                return 57520 <= P && P <= 57527;
              }),
              (H.excludeFromContrastRatioDemands = function (P) {
                return (
                  K(P) ||
                  (function (V) {
                    return 9472 <= V && V <= 9631;
                  })(P)
                );
              }),
              (H.createRenderDimensions = function () {
                return {
                  css: {
                    canvas: { width: 0, height: 0 },
                    cell: { width: 0, height: 0 },
                  },
                  device: {
                    canvas: { width: 0, height: 0 },
                    cell: { width: 0, height: 0 },
                    char: { width: 0, height: 0, left: 0, top: 0 },
                  },
                };
              });
          },
          456: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.SelectionModel = void 0),
              (H.SelectionModel = class {
                constructor(K) {
                  (this._bufferService = K),
                    (this.isSelectAllActive = !1),
                    (this.selectionStartLength = 0);
                }
                clearSelection() {
                  (this.selectionStart = void 0),
                    (this.selectionEnd = void 0),
                    (this.isSelectAllActive = !1),
                    (this.selectionStartLength = 0);
                }
                get finalSelectionStart() {
                  return this.isSelectAllActive
                    ? [0, 0]
                    : this.selectionEnd &&
                        this.selectionStart &&
                        this.areSelectionValuesReversed()
                      ? this.selectionEnd
                      : this.selectionStart;
                }
                get finalSelectionEnd() {
                  if (this.isSelectAllActive)
                    return [
                      this._bufferService.cols,
                      this._bufferService.buffer.ybase +
                        this._bufferService.rows -
                        1,
                    ];
                  if (this.selectionStart) {
                    if (
                      !this.selectionEnd ||
                      this.areSelectionValuesReversed()
                    ) {
                      let K =
                        this.selectionStart[0] + this.selectionStartLength;
                      return K > this._bufferService.cols
                        ? K % this._bufferService.cols == 0
                          ? [
                              this._bufferService.cols,
                              this.selectionStart[1] +
                                Math.floor(K / this._bufferService.cols) -
                                1,
                            ]
                          : [
                              K % this._bufferService.cols,
                              this.selectionStart[1] +
                                Math.floor(K / this._bufferService.cols),
                            ]
                        : [K, this.selectionStart[1]];
                    }
                    if (
                      this.selectionStartLength &&
                      this.selectionEnd[1] === this.selectionStart[1]
                    ) {
                      let K =
                        this.selectionStart[0] + this.selectionStartLength;
                      return K > this._bufferService.cols
                        ? [
                            K % this._bufferService.cols,
                            this.selectionStart[1] +
                              Math.floor(K / this._bufferService.cols),
                          ]
                        : [
                            Math.max(K, this.selectionEnd[0]),
                            this.selectionEnd[1],
                          ];
                    }
                    return this.selectionEnd;
                  }
                }
                areSelectionValuesReversed() {
                  let K = this.selectionStart,
                    P = this.selectionEnd;
                  return (
                    !(!K || !P) &&
                    (K[1] > P[1] || (K[1] === P[1] && K[0] > P[0]))
                  );
                }
                handleTrim(K) {
                  return (
                    this.selectionStart && (this.selectionStart[1] -= K),
                    this.selectionEnd && (this.selectionEnd[1] -= K),
                    this.selectionEnd && this.selectionEnd[1] < 0
                      ? (this.clearSelection(), !0)
                      : (this.selectionStart &&
                          this.selectionStart[1] < 0 &&
                          (this.selectionStart[1] = 0),
                        !1)
                  );
                }
              });
          },
          428: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (Q, W, Z, Y) {
                  var F,
                    j = arguments.length,
                    $ =
                      j < 3
                        ? W
                        : Y === null
                          ? (Y = Object.getOwnPropertyDescriptor(W, Z))
                          : Y;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    $ = Reflect.decorate(Q, W, Z, Y);
                  else
                    for (var E = Q.length - 1; E >= 0; E--)
                      (F = Q[E]) &&
                        ($ =
                          (j < 3 ? F($) : j > 3 ? F(W, Z, $) : F(W, Z)) || $);
                  return j > 3 && $ && Object.defineProperty(W, Z, $), $;
                },
              V =
                (this && this.__param) ||
                function (Q, W) {
                  return function (Z, Y) {
                    W(Z, Y, Q);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.CharSizeService = void 0);
            let q = K(2585),
              J = K(8460),
              N = K(844),
              X = (H.CharSizeService = class extends N.Disposable {
                get hasValidSize() {
                  return this.width > 0 && this.height > 0;
                }
                constructor(Q, W, Z) {
                  super(),
                    (this._optionsService = Z),
                    (this.width = 0),
                    (this.height = 0),
                    (this._onCharSizeChange = this.register(
                      new J.EventEmitter()
                    )),
                    (this.onCharSizeChange = this._onCharSizeChange.event),
                    (this._measureStrategy = new G(Q, W, this._optionsService)),
                    this.register(
                      this._optionsService.onMultipleOptionChange(
                        ["fontFamily", "fontSize"],
                        () => this.measure()
                      )
                    );
                }
                measure() {
                  let Q = this._measureStrategy.measure();
                  (Q.width === this.width && Q.height === this.height) ||
                    ((this.width = Q.width),
                    (this.height = Q.height),
                    this._onCharSizeChange.fire());
                }
              });
            H.CharSizeService = X = P([V(2, q.IOptionsService)], X);
            class G {
              constructor(Q, W, Z) {
                (this._document = Q),
                  (this._parentElement = W),
                  (this._optionsService = Z),
                  (this._result = { width: 0, height: 0 }),
                  (this._measureElement = this._document.createElement("span")),
                  this._measureElement.classList.add(
                    "xterm-char-measure-element"
                  ),
                  (this._measureElement.textContent = "W".repeat(32)),
                  this._measureElement.setAttribute("aria-hidden", "true"),
                  (this._measureElement.style.whiteSpace = "pre"),
                  (this._measureElement.style.fontKerning = "none"),
                  this._parentElement.appendChild(this._measureElement);
              }
              measure() {
                (this._measureElement.style.fontFamily =
                  this._optionsService.rawOptions.fontFamily),
                  (this._measureElement.style.fontSize = `${this._optionsService.rawOptions.fontSize}px`);
                let Q = {
                  height: Number(this._measureElement.offsetHeight),
                  width: Number(this._measureElement.offsetWidth),
                };
                return (
                  Q.width !== 0 &&
                    Q.height !== 0 &&
                    ((this._result.width = Q.width / 32),
                    (this._result.height = Math.ceil(Q.height))),
                  this._result
                );
              }
            }
          },
          4269: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (W, Z, Y, F) {
                  var j,
                    $ = arguments.length,
                    E =
                      $ < 3
                        ? Z
                        : F === null
                          ? (F = Object.getOwnPropertyDescriptor(Z, Y))
                          : F;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    E = Reflect.decorate(W, Z, Y, F);
                  else
                    for (var U = W.length - 1; U >= 0; U--)
                      (j = W[U]) &&
                        (E =
                          ($ < 3 ? j(E) : $ > 3 ? j(Z, Y, E) : j(Z, Y)) || E);
                  return $ > 3 && E && Object.defineProperty(Z, Y, E), E;
                },
              V =
                (this && this.__param) ||
                function (W, Z) {
                  return function (Y, F) {
                    Z(Y, F, W);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.CharacterJoinerService = H.JoinedCellData = void 0);
            let q = K(3734),
              J = K(643),
              N = K(511),
              X = K(2585);
            class G extends q.AttributeData {
              constructor(W, Z, Y) {
                super(),
                  (this.content = 0),
                  (this.combinedData = ""),
                  (this.fg = W.fg),
                  (this.bg = W.bg),
                  (this.combinedData = Z),
                  (this._width = Y);
              }
              isCombined() {
                return 2097152;
              }
              getWidth() {
                return this._width;
              }
              getChars() {
                return this.combinedData;
              }
              getCode() {
                return 2097151;
              }
              setFromCharData(W) {
                throw Error("not implemented");
              }
              getAsCharData() {
                return [
                  this.fg,
                  this.getChars(),
                  this.getWidth(),
                  this.getCode(),
                ];
              }
            }
            H.JoinedCellData = G;
            let Q = (H.CharacterJoinerService = class W {
              constructor(Z) {
                (this._bufferService = Z),
                  (this._characterJoiners = []),
                  (this._nextCharacterJoinerId = 0),
                  (this._workCell = new N.CellData());
              }
              register(Z) {
                let Y = { id: this._nextCharacterJoinerId++, handler: Z };
                return this._characterJoiners.push(Y), Y.id;
              }
              deregister(Z) {
                for (let Y = 0; Y < this._characterJoiners.length; Y++)
                  if (this._characterJoiners[Y].id === Z)
                    return this._characterJoiners.splice(Y, 1), !0;
                return !1;
              }
              getJoinedCharacters(Z) {
                if (this._characterJoiners.length === 0) return [];
                let Y = this._bufferService.buffer.lines.get(Z);
                if (!Y || Y.length === 0) return [];
                let F = [],
                  j = Y.translateToString(!0),
                  $ = 0,
                  E = 0,
                  U = 0,
                  z = Y.getFg(0),
                  k = Y.getBg(0);
                for (let O = 0; O < Y.getTrimmedLength(); O++)
                  if (
                    (Y.loadCell(O, this._workCell),
                    this._workCell.getWidth() !== 0)
                  ) {
                    if (this._workCell.fg !== z || this._workCell.bg !== k) {
                      if (O - $ > 1) {
                        let L = this._getJoinedRanges(j, U, E, Y, $);
                        for (let b = 0; b < L.length; b++) F.push(L[b]);
                      }
                      ($ = O),
                        (U = E),
                        (z = this._workCell.fg),
                        (k = this._workCell.bg);
                    }
                    E +=
                      this._workCell.getChars().length ||
                      J.WHITESPACE_CELL_CHAR.length;
                  }
                if (this._bufferService.cols - $ > 1) {
                  let O = this._getJoinedRanges(j, U, E, Y, $);
                  for (let L = 0; L < O.length; L++) F.push(O[L]);
                }
                return F;
              }
              _getJoinedRanges(Z, Y, F, j, $) {
                let E = Z.substring(Y, F),
                  U = [];
                try {
                  U = this._characterJoiners[0].handler(E);
                } catch (z) {
                  console.error(z);
                }
                for (let z = 1; z < this._characterJoiners.length; z++)
                  try {
                    let k = this._characterJoiners[z].handler(E);
                    for (let O = 0; O < k.length; O++) W._mergeRanges(U, k[O]);
                  } catch (k) {
                    console.error(k);
                  }
                return this._stringRangesToCellRanges(U, j, $), U;
              }
              _stringRangesToCellRanges(Z, Y, F) {
                let j = 0,
                  $ = !1,
                  E = 0,
                  U = Z[j];
                if (U) {
                  for (let z = F; z < this._bufferService.cols; z++) {
                    let k = Y.getWidth(z),
                      O =
                        Y.getString(z).length || J.WHITESPACE_CELL_CHAR.length;
                    if (k !== 0) {
                      if (
                        (!$ && U[0] <= E && ((U[0] = z), ($ = !0)), U[1] <= E)
                      ) {
                        if (((U[1] = z), (U = Z[++j]), !U)) break;
                        U[0] <= E ? ((U[0] = z), ($ = !0)) : ($ = !1);
                      }
                      E += O;
                    }
                  }
                  U && (U[1] = this._bufferService.cols);
                }
              }
              static _mergeRanges(Z, Y) {
                let F = !1;
                for (let j = 0; j < Z.length; j++) {
                  let $ = Z[j];
                  if (F) {
                    if (Y[1] <= $[0]) return (Z[j - 1][1] = Y[1]), Z;
                    if (Y[1] <= $[1])
                      return (
                        (Z[j - 1][1] = Math.max(Y[1], $[1])), Z.splice(j, 1), Z
                      );
                    Z.splice(j, 1), j--;
                  } else {
                    if (Y[1] <= $[0]) return Z.splice(j, 0, Y), Z;
                    if (Y[1] <= $[1]) return ($[0] = Math.min(Y[0], $[0])), Z;
                    Y[0] < $[1] && (($[0] = Math.min(Y[0], $[0])), (F = !0));
                  }
                }
                return F ? (Z[Z.length - 1][1] = Y[1]) : Z.push(Y), Z;
              }
            });
            H.CharacterJoinerService = Q = P([V(0, X.IBufferService)], Q);
          },
          5114: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.CoreBrowserService = void 0),
              (H.CoreBrowserService = class {
                constructor(K, P) {
                  (this._textarea = K),
                    (this.window = P),
                    (this._isFocused = !1),
                    (this._cachedIsFocused = void 0),
                    this._textarea.addEventListener(
                      "focus",
                      () => (this._isFocused = !0)
                    ),
                    this._textarea.addEventListener(
                      "blur",
                      () => (this._isFocused = !1)
                    );
                }
                get dpr() {
                  return this.window.devicePixelRatio;
                }
                get isFocused() {
                  return (
                    this._cachedIsFocused === void 0 &&
                      ((this._cachedIsFocused =
                        this._isFocused &&
                        this._textarea.ownerDocument.hasFocus()),
                      queueMicrotask(() => (this._cachedIsFocused = void 0))),
                    this._cachedIsFocused
                  );
                }
              });
          },
          8934: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (X, G, Q, W) {
                  var Z,
                    Y = arguments.length,
                    F =
                      Y < 3
                        ? G
                        : W === null
                          ? (W = Object.getOwnPropertyDescriptor(G, Q))
                          : W;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    F = Reflect.decorate(X, G, Q, W);
                  else
                    for (var j = X.length - 1; j >= 0; j--)
                      (Z = X[j]) &&
                        (F =
                          (Y < 3 ? Z(F) : Y > 3 ? Z(G, Q, F) : Z(G, Q)) || F);
                  return Y > 3 && F && Object.defineProperty(G, Q, F), F;
                },
              V =
                (this && this.__param) ||
                function (X, G) {
                  return function (Q, W) {
                    G(Q, W, X);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.MouseService = void 0);
            let q = K(4725),
              J = K(9806),
              N = (H.MouseService = class {
                constructor(X, G) {
                  (this._renderService = X), (this._charSizeService = G);
                }
                getCoords(X, G, Q, W, Z) {
                  return (0, J.getCoords)(
                    window,
                    X,
                    G,
                    Q,
                    W,
                    this._charSizeService.hasValidSize,
                    this._renderService.dimensions.css.cell.width,
                    this._renderService.dimensions.css.cell.height,
                    Z
                  );
                }
                getMouseReportCoords(X, G) {
                  let Q = (0, J.getCoordsRelativeToElement)(window, X, G);
                  if (this._charSizeService.hasValidSize)
                    return (
                      (Q[0] = Math.min(
                        Math.max(Q[0], 0),
                        this._renderService.dimensions.css.canvas.width - 1
                      )),
                      (Q[1] = Math.min(
                        Math.max(Q[1], 0),
                        this._renderService.dimensions.css.canvas.height - 1
                      )),
                      {
                        col: Math.floor(
                          Q[0] / this._renderService.dimensions.css.cell.width
                        ),
                        row: Math.floor(
                          Q[1] / this._renderService.dimensions.css.cell.height
                        ),
                        x: Math.floor(Q[0]),
                        y: Math.floor(Q[1]),
                      }
                    );
                }
              });
            H.MouseService = N = P(
              [V(0, q.IRenderService), V(1, q.ICharSizeService)],
              N
            );
          },
          3230: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (F, j, $, E) {
                  var U,
                    z = arguments.length,
                    k =
                      z < 3
                        ? j
                        : E === null
                          ? (E = Object.getOwnPropertyDescriptor(j, $))
                          : E;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    k = Reflect.decorate(F, j, $, E);
                  else
                    for (var O = F.length - 1; O >= 0; O--)
                      (U = F[O]) &&
                        (k =
                          (z < 3 ? U(k) : z > 3 ? U(j, $, k) : U(j, $)) || k);
                  return z > 3 && k && Object.defineProperty(j, $, k), k;
                },
              V =
                (this && this.__param) ||
                function (F, j) {
                  return function ($, E) {
                    j($, E, F);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.RenderService = void 0);
            let q = K(3656),
              J = K(6193),
              N = K(5596),
              X = K(4725),
              G = K(8460),
              Q = K(844),
              W = K(7226),
              Z = K(2585),
              Y = (H.RenderService = class extends Q.Disposable {
                get dimensions() {
                  return this._renderer.value.dimensions;
                }
                constructor(F, j, $, E, U, z, k, O) {
                  if (
                    (super(),
                    (this._rowCount = F),
                    (this._charSizeService = E),
                    (this._renderer = this.register(new Q.MutableDisposable())),
                    (this._pausedResizeTask = new W.DebouncedIdleTask()),
                    (this._isPaused = !1),
                    (this._needsFullRefresh = !1),
                    (this._isNextRenderRedrawOnly = !0),
                    (this._needsSelectionRefresh = !1),
                    (this._canvasWidth = 0),
                    (this._canvasHeight = 0),
                    (this._selectionState = {
                      start: void 0,
                      end: void 0,
                      columnSelectMode: !1,
                    }),
                    (this._onDimensionsChange = this.register(
                      new G.EventEmitter()
                    )),
                    (this.onDimensionsChange = this._onDimensionsChange.event),
                    (this._onRenderedViewportChange = this.register(
                      new G.EventEmitter()
                    )),
                    (this.onRenderedViewportChange =
                      this._onRenderedViewportChange.event),
                    (this._onRender = this.register(new G.EventEmitter())),
                    (this.onRender = this._onRender.event),
                    (this._onRefreshRequest = this.register(
                      new G.EventEmitter()
                    )),
                    (this.onRefreshRequest = this._onRefreshRequest.event),
                    (this._renderDebouncer = new J.RenderDebouncer(
                      k.window,
                      (L, b) => this._renderRows(L, b)
                    )),
                    this.register(this._renderDebouncer),
                    (this._screenDprMonitor = new N.ScreenDprMonitor(k.window)),
                    this._screenDprMonitor.setListener(() =>
                      this.handleDevicePixelRatioChange()
                    ),
                    this.register(this._screenDprMonitor),
                    this.register(z.onResize(() => this._fullRefresh())),
                    this.register(
                      z.buffers.onBufferActivate(() => {
                        var L;
                        return (L = this._renderer.value) === null ||
                          L === void 0
                          ? void 0
                          : L.clear();
                      })
                    ),
                    this.register(
                      $.onOptionChange(() => this._handleOptionsChanged())
                    ),
                    this.register(
                      this._charSizeService.onCharSizeChange(() =>
                        this.handleCharSizeChanged()
                      )
                    ),
                    this.register(
                      U.onDecorationRegistered(() => this._fullRefresh())
                    ),
                    this.register(
                      U.onDecorationRemoved(() => this._fullRefresh())
                    ),
                    this.register(
                      $.onMultipleOptionChange(
                        [
                          "customGlyphs",
                          "drawBoldTextInBrightColors",
                          "letterSpacing",
                          "lineHeight",
                          "fontFamily",
                          "fontSize",
                          "fontWeight",
                          "fontWeightBold",
                          "minimumContrastRatio",
                        ],
                        () => {
                          this.clear(),
                            this.handleResize(z.cols, z.rows),
                            this._fullRefresh();
                        }
                      )
                    ),
                    this.register(
                      $.onMultipleOptionChange(
                        ["cursorBlink", "cursorStyle"],
                        () => this.refreshRows(z.buffer.y, z.buffer.y, !0)
                      )
                    ),
                    this.register(
                      (0, q.addDisposableDomListener)(k.window, "resize", () =>
                        this.handleDevicePixelRatioChange()
                      )
                    ),
                    this.register(O.onChangeColors(() => this._fullRefresh())),
                    "IntersectionObserver" in k.window)
                  ) {
                    let L = new k.window.IntersectionObserver(
                      (b) => this._handleIntersectionChange(b[b.length - 1]),
                      { threshold: 0 }
                    );
                    L.observe(j),
                      this.register({ dispose: () => L.disconnect() });
                  }
                }
                _handleIntersectionChange(F) {
                  (this._isPaused =
                    F.isIntersecting === void 0
                      ? F.intersectionRatio === 0
                      : !F.isIntersecting),
                    this._isPaused ||
                      this._charSizeService.hasValidSize ||
                      this._charSizeService.measure(),
                    !this._isPaused &&
                      this._needsFullRefresh &&
                      (this._pausedResizeTask.flush(),
                      this.refreshRows(0, this._rowCount - 1),
                      (this._needsFullRefresh = !1));
                }
                refreshRows(F, j, $ = !1) {
                  this._isPaused
                    ? (this._needsFullRefresh = !0)
                    : ($ || (this._isNextRenderRedrawOnly = !1),
                      this._renderDebouncer.refresh(F, j, this._rowCount));
                }
                _renderRows(F, j) {
                  this._renderer.value &&
                    ((F = Math.min(F, this._rowCount - 1)),
                    (j = Math.min(j, this._rowCount - 1)),
                    this._renderer.value.renderRows(F, j),
                    this._needsSelectionRefresh &&
                      (this._renderer.value.handleSelectionChanged(
                        this._selectionState.start,
                        this._selectionState.end,
                        this._selectionState.columnSelectMode
                      ),
                      (this._needsSelectionRefresh = !1)),
                    this._isNextRenderRedrawOnly ||
                      this._onRenderedViewportChange.fire({ start: F, end: j }),
                    this._onRender.fire({ start: F, end: j }),
                    (this._isNextRenderRedrawOnly = !0));
                }
                resize(F, j) {
                  (this._rowCount = j), this._fireOnCanvasResize();
                }
                _handleOptionsChanged() {
                  this._renderer.value &&
                    (this.refreshRows(0, this._rowCount - 1),
                    this._fireOnCanvasResize());
                }
                _fireOnCanvasResize() {
                  this._renderer.value &&
                    ((this._renderer.value.dimensions.css.canvas.width ===
                      this._canvasWidth &&
                      this._renderer.value.dimensions.css.canvas.height ===
                        this._canvasHeight) ||
                      this._onDimensionsChange.fire(
                        this._renderer.value.dimensions
                      ));
                }
                hasRenderer() {
                  return !!this._renderer.value;
                }
                setRenderer(F) {
                  (this._renderer.value = F),
                    this._renderer.value.onRequestRedraw((j) =>
                      this.refreshRows(j.start, j.end, !0)
                    ),
                    (this._needsSelectionRefresh = !0),
                    this._fullRefresh();
                }
                addRefreshCallback(F) {
                  return this._renderDebouncer.addRefreshCallback(F);
                }
                _fullRefresh() {
                  this._isPaused
                    ? (this._needsFullRefresh = !0)
                    : this.refreshRows(0, this._rowCount - 1);
                }
                clearTextureAtlas() {
                  var F, j;
                  this._renderer.value &&
                    ((j = (F = this._renderer.value).clearTextureAtlas) ===
                      null ||
                      j === void 0 ||
                      j.call(F),
                    this._fullRefresh());
                }
                handleDevicePixelRatioChange() {
                  this._charSizeService.measure(),
                    this._renderer.value &&
                      (this._renderer.value.handleDevicePixelRatioChange(),
                      this.refreshRows(0, this._rowCount - 1));
                }
                handleResize(F, j) {
                  this._renderer.value &&
                    (this._isPaused
                      ? this._pausedResizeTask.set(() =>
                          this._renderer.value.handleResize(F, j)
                        )
                      : this._renderer.value.handleResize(F, j),
                    this._fullRefresh());
                }
                handleCharSizeChanged() {
                  var F;
                  (F = this._renderer.value) === null ||
                    F === void 0 ||
                    F.handleCharSizeChanged();
                }
                handleBlur() {
                  var F;
                  (F = this._renderer.value) === null ||
                    F === void 0 ||
                    F.handleBlur();
                }
                handleFocus() {
                  var F;
                  (F = this._renderer.value) === null ||
                    F === void 0 ||
                    F.handleFocus();
                }
                handleSelectionChanged(F, j, $) {
                  var E;
                  (this._selectionState.start = F),
                    (this._selectionState.end = j),
                    (this._selectionState.columnSelectMode = $),
                    (E = this._renderer.value) === null ||
                      E === void 0 ||
                      E.handleSelectionChanged(F, j, $);
                }
                handleCursorMove() {
                  var F;
                  (F = this._renderer.value) === null ||
                    F === void 0 ||
                    F.handleCursorMove();
                }
                clear() {
                  var F;
                  (F = this._renderer.value) === null ||
                    F === void 0 ||
                    F.clear();
                }
              });
            H.RenderService = Y = P(
              [
                V(2, Z.IOptionsService),
                V(3, X.ICharSizeService),
                V(4, Z.IDecorationService),
                V(5, Z.IBufferService),
                V(6, X.ICoreBrowserService),
                V(7, X.IThemeService),
              ],
              Y
            );
          },
          9312: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (U, z, k, O) {
                  var L,
                    b = arguments.length,
                    B =
                      b < 3
                        ? z
                        : O === null
                          ? (O = Object.getOwnPropertyDescriptor(z, k))
                          : O;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    B = Reflect.decorate(U, z, k, O);
                  else
                    for (var S = U.length - 1; S >= 0; S--)
                      (L = U[S]) &&
                        (B =
                          (b < 3 ? L(B) : b > 3 ? L(z, k, B) : L(z, k)) || B);
                  return b > 3 && B && Object.defineProperty(z, k, B), B;
                },
              V =
                (this && this.__param) ||
                function (U, z) {
                  return function (k, O) {
                    z(k, O, U);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.SelectionService = void 0);
            let q = K(9806),
              J = K(9504),
              N = K(456),
              X = K(4725),
              G = K(8460),
              Q = K(844),
              W = K(6114),
              Z = K(4841),
              Y = K(511),
              F = K(2585),
              j = String.fromCharCode(160),
              $ = new RegExp(j, "g"),
              E = (H.SelectionService = class extends Q.Disposable {
                constructor(U, z, k, O, L, b, B, S, I) {
                  super(),
                    (this._element = U),
                    (this._screenElement = z),
                    (this._linkifier = k),
                    (this._bufferService = O),
                    (this._coreService = L),
                    (this._mouseService = b),
                    (this._optionsService = B),
                    (this._renderService = S),
                    (this._coreBrowserService = I),
                    (this._dragScrollAmount = 0),
                    (this._enabled = !0),
                    (this._workCell = new Y.CellData()),
                    (this._mouseDownTimeStamp = 0),
                    (this._oldHasSelection = !1),
                    (this._oldSelectionStart = void 0),
                    (this._oldSelectionEnd = void 0),
                    (this._onLinuxMouseSelection = this.register(
                      new G.EventEmitter()
                    )),
                    (this.onLinuxMouseSelection =
                      this._onLinuxMouseSelection.event),
                    (this._onRedrawRequest = this.register(
                      new G.EventEmitter()
                    )),
                    (this.onRequestRedraw = this._onRedrawRequest.event),
                    (this._onSelectionChange = this.register(
                      new G.EventEmitter()
                    )),
                    (this.onSelectionChange = this._onSelectionChange.event),
                    (this._onRequestScrollLines = this.register(
                      new G.EventEmitter()
                    )),
                    (this.onRequestScrollLines =
                      this._onRequestScrollLines.event),
                    (this._mouseMoveListener = (R) => this._handleMouseMove(R)),
                    (this._mouseUpListener = (R) => this._handleMouseUp(R)),
                    this._coreService.onUserInput(() => {
                      this.hasSelection && this.clearSelection();
                    }),
                    (this._trimListener =
                      this._bufferService.buffer.lines.onTrim((R) =>
                        this._handleTrim(R)
                      )),
                    this.register(
                      this._bufferService.buffers.onBufferActivate((R) =>
                        this._handleBufferActivate(R)
                      )
                    ),
                    this.enable(),
                    (this._model = new N.SelectionModel(this._bufferService)),
                    (this._activeSelectionMode = 0),
                    this.register(
                      (0, Q.toDisposable)(() => {
                        this._removeMouseDownListeners();
                      })
                    );
                }
                reset() {
                  this.clearSelection();
                }
                disable() {
                  this.clearSelection(), (this._enabled = !1);
                }
                enable() {
                  this._enabled = !0;
                }
                get selectionStart() {
                  return this._model.finalSelectionStart;
                }
                get selectionEnd() {
                  return this._model.finalSelectionEnd;
                }
                get hasSelection() {
                  let U = this._model.finalSelectionStart,
                    z = this._model.finalSelectionEnd;
                  return !(!U || !z || (U[0] === z[0] && U[1] === z[1]));
                }
                get selectionText() {
                  let U = this._model.finalSelectionStart,
                    z = this._model.finalSelectionEnd;
                  if (!U || !z) return "";
                  let k = this._bufferService.buffer,
                    O = [];
                  if (this._activeSelectionMode === 3) {
                    if (U[0] === z[0]) return "";
                    let L = U[0] < z[0] ? U[0] : z[0],
                      b = U[0] < z[0] ? z[0] : U[0];
                    for (let B = U[1]; B <= z[1]; B++) {
                      let S = k.translateBufferLineToString(B, !0, L, b);
                      O.push(S);
                    }
                  } else {
                    let L = U[1] === z[1] ? z[0] : void 0;
                    O.push(k.translateBufferLineToString(U[1], !0, U[0], L));
                    for (let b = U[1] + 1; b <= z[1] - 1; b++) {
                      let B = k.lines.get(b),
                        S = k.translateBufferLineToString(b, !0);
                      (B == null ? void 0 : B.isWrapped)
                        ? (O[O.length - 1] += S)
                        : O.push(S);
                    }
                    if (U[1] !== z[1]) {
                      let b = k.lines.get(z[1]),
                        B = k.translateBufferLineToString(z[1], !0, 0, z[0]);
                      b && b.isWrapped ? (O[O.length - 1] += B) : O.push(B);
                    }
                  }
                  return O.map((L) => L.replace($, " ")).join(
                    W.isWindows
                      ? `\r
`
                      : `
`
                  );
                }
                clearSelection() {
                  this._model.clearSelection(),
                    this._removeMouseDownListeners(),
                    this.refresh(),
                    this._onSelectionChange.fire();
                }
                refresh(U) {
                  this._refreshAnimationFrame ||
                    (this._refreshAnimationFrame =
                      this._coreBrowserService.window.requestAnimationFrame(
                        () => this._refresh()
                      )),
                    W.isLinux &&
                      U &&
                      this.selectionText.length &&
                      this._onLinuxMouseSelection.fire(this.selectionText);
                }
                _refresh() {
                  (this._refreshAnimationFrame = void 0),
                    this._onRedrawRequest.fire({
                      start: this._model.finalSelectionStart,
                      end: this._model.finalSelectionEnd,
                      columnSelectMode: this._activeSelectionMode === 3,
                    });
                }
                _isClickInSelection(U) {
                  let z = this._getMouseBufferCoords(U),
                    k = this._model.finalSelectionStart,
                    O = this._model.finalSelectionEnd;
                  return !!(k && O && z) && this._areCoordsInSelection(z, k, O);
                }
                isCellInSelection(U, z) {
                  let k = this._model.finalSelectionStart,
                    O = this._model.finalSelectionEnd;
                  return (
                    !(!k || !O) && this._areCoordsInSelection([U, z], k, O)
                  );
                }
                _areCoordsInSelection(U, z, k) {
                  return (
                    (U[1] > z[1] && U[1] < k[1]) ||
                    (z[1] === k[1] &&
                      U[1] === z[1] &&
                      U[0] >= z[0] &&
                      U[0] < k[0]) ||
                    (z[1] < k[1] && U[1] === k[1] && U[0] < k[0]) ||
                    (z[1] < k[1] && U[1] === z[1] && U[0] >= z[0])
                  );
                }
                _selectWordAtCursor(U, z) {
                  var k, O;
                  let L =
                    (O =
                      (k = this._linkifier.currentLink) === null || k === void 0
                        ? void 0
                        : k.link) === null || O === void 0
                      ? void 0
                      : O.range;
                  if (L)
                    return (
                      (this._model.selectionStart = [
                        L.start.x - 1,
                        L.start.y - 1,
                      ]),
                      (this._model.selectionStartLength = (0, Z.getRangeLength)(
                        L,
                        this._bufferService.cols
                      )),
                      (this._model.selectionEnd = void 0),
                      !0
                    );
                  let b = this._getMouseBufferCoords(U);
                  return (
                    !!b &&
                    (this._selectWordAt(b, z),
                    (this._model.selectionEnd = void 0),
                    !0)
                  );
                }
                selectAll() {
                  (this._model.isSelectAllActive = !0),
                    this.refresh(),
                    this._onSelectionChange.fire();
                }
                selectLines(U, z) {
                  this._model.clearSelection(),
                    (U = Math.max(U, 0)),
                    (z = Math.min(
                      z,
                      this._bufferService.buffer.lines.length - 1
                    )),
                    (this._model.selectionStart = [0, U]),
                    (this._model.selectionEnd = [this._bufferService.cols, z]),
                    this.refresh(),
                    this._onSelectionChange.fire();
                }
                _handleTrim(U) {
                  this._model.handleTrim(U) && this.refresh();
                }
                _getMouseBufferCoords(U) {
                  let z = this._mouseService.getCoords(
                    U,
                    this._screenElement,
                    this._bufferService.cols,
                    this._bufferService.rows,
                    !0
                  );
                  if (z)
                    return (
                      z[0]--,
                      z[1]--,
                      (z[1] += this._bufferService.buffer.ydisp),
                      z
                    );
                }
                _getMouseEventScrollAmount(U) {
                  let z = (0, q.getCoordsRelativeToElement)(
                      this._coreBrowserService.window,
                      U,
                      this._screenElement
                    )[1],
                    k = this._renderService.dimensions.css.canvas.height;
                  return z >= 0 && z <= k
                    ? 0
                    : (z > k && (z -= k),
                      (z = Math.min(Math.max(z, -50), 50)),
                      (z /= 50),
                      z / Math.abs(z) + Math.round(14 * z));
                }
                shouldForceSelection(U) {
                  return W.isMac
                    ? U.altKey &&
                        this._optionsService.rawOptions
                          .macOptionClickForcesSelection
                    : U.shiftKey;
                }
                handleMouseDown(U) {
                  if (
                    ((this._mouseDownTimeStamp = U.timeStamp),
                    (U.button !== 2 || !this.hasSelection) && U.button === 0)
                  ) {
                    if (!this._enabled) {
                      if (!this.shouldForceSelection(U)) return;
                      U.stopPropagation();
                    }
                    U.preventDefault(),
                      (this._dragScrollAmount = 0),
                      this._enabled && U.shiftKey
                        ? this._handleIncrementalClick(U)
                        : U.detail === 1
                          ? this._handleSingleClick(U)
                          : U.detail === 2
                            ? this._handleDoubleClick(U)
                            : U.detail === 3 && this._handleTripleClick(U),
                      this._addMouseDownListeners(),
                      this.refresh(!0);
                  }
                }
                _addMouseDownListeners() {
                  this._screenElement.ownerDocument &&
                    (this._screenElement.ownerDocument.addEventListener(
                      "mousemove",
                      this._mouseMoveListener
                    ),
                    this._screenElement.ownerDocument.addEventListener(
                      "mouseup",
                      this._mouseUpListener
                    )),
                    (this._dragScrollIntervalTimer =
                      this._coreBrowserService.window.setInterval(
                        () => this._dragScroll(),
                        50
                      ));
                }
                _removeMouseDownListeners() {
                  this._screenElement.ownerDocument &&
                    (this._screenElement.ownerDocument.removeEventListener(
                      "mousemove",
                      this._mouseMoveListener
                    ),
                    this._screenElement.ownerDocument.removeEventListener(
                      "mouseup",
                      this._mouseUpListener
                    )),
                    this._coreBrowserService.window.clearInterval(
                      this._dragScrollIntervalTimer
                    ),
                    (this._dragScrollIntervalTimer = void 0);
                }
                _handleIncrementalClick(U) {
                  this._model.selectionStart &&
                    (this._model.selectionEnd = this._getMouseBufferCoords(U));
                }
                _handleSingleClick(U) {
                  if (
                    ((this._model.selectionStartLength = 0),
                    (this._model.isSelectAllActive = !1),
                    (this._activeSelectionMode = this.shouldColumnSelect(U)
                      ? 3
                      : 0),
                    (this._model.selectionStart =
                      this._getMouseBufferCoords(U)),
                    !this._model.selectionStart)
                  )
                    return;
                  this._model.selectionEnd = void 0;
                  let z = this._bufferService.buffer.lines.get(
                    this._model.selectionStart[1]
                  );
                  z &&
                    z.length !== this._model.selectionStart[0] &&
                    z.hasWidth(this._model.selectionStart[0]) === 0 &&
                    this._model.selectionStart[0]++;
                }
                _handleDoubleClick(U) {
                  this._selectWordAtCursor(U, !0) &&
                    (this._activeSelectionMode = 1);
                }
                _handleTripleClick(U) {
                  let z = this._getMouseBufferCoords(U);
                  z &&
                    ((this._activeSelectionMode = 2), this._selectLineAt(z[1]));
                }
                shouldColumnSelect(U) {
                  return (
                    U.altKey &&
                    !(
                      W.isMac &&
                      this._optionsService.rawOptions
                        .macOptionClickForcesSelection
                    )
                  );
                }
                _handleMouseMove(U) {
                  if (
                    (U.stopImmediatePropagation(), !this._model.selectionStart)
                  )
                    return;
                  let z = this._model.selectionEnd
                    ? [this._model.selectionEnd[0], this._model.selectionEnd[1]]
                    : null;
                  if (
                    ((this._model.selectionEnd = this._getMouseBufferCoords(U)),
                    !this._model.selectionEnd)
                  )
                    return void this.refresh(!0);
                  this._activeSelectionMode === 2
                    ? this._model.selectionEnd[1] <
                      this._model.selectionStart[1]
                      ? (this._model.selectionEnd[0] = 0)
                      : (this._model.selectionEnd[0] = this._bufferService.cols)
                    : this._activeSelectionMode === 1 &&
                      this._selectToWordAt(this._model.selectionEnd),
                    (this._dragScrollAmount =
                      this._getMouseEventScrollAmount(U)),
                    this._activeSelectionMode !== 3 &&
                      (this._dragScrollAmount > 0
                        ? (this._model.selectionEnd[0] =
                            this._bufferService.cols)
                        : this._dragScrollAmount < 0 &&
                          (this._model.selectionEnd[0] = 0));
                  let k = this._bufferService.buffer;
                  if (this._model.selectionEnd[1] < k.lines.length) {
                    let O = k.lines.get(this._model.selectionEnd[1]);
                    O &&
                      O.hasWidth(this._model.selectionEnd[0]) === 0 &&
                      this._model.selectionEnd[0]++;
                  }
                  (z &&
                    z[0] === this._model.selectionEnd[0] &&
                    z[1] === this._model.selectionEnd[1]) ||
                    this.refresh(!0);
                }
                _dragScroll() {
                  if (
                    this._model.selectionEnd &&
                    this._model.selectionStart &&
                    this._dragScrollAmount
                  ) {
                    this._onRequestScrollLines.fire({
                      amount: this._dragScrollAmount,
                      suppressScrollEvent: !1,
                    });
                    let U = this._bufferService.buffer;
                    this._dragScrollAmount > 0
                      ? (this._activeSelectionMode !== 3 &&
                          (this._model.selectionEnd[0] =
                            this._bufferService.cols),
                        (this._model.selectionEnd[1] = Math.min(
                          U.ydisp + this._bufferService.rows,
                          U.lines.length - 1
                        )))
                      : (this._activeSelectionMode !== 3 &&
                          (this._model.selectionEnd[0] = 0),
                        (this._model.selectionEnd[1] = U.ydisp)),
                      this.refresh();
                  }
                }
                _handleMouseUp(U) {
                  let z = U.timeStamp - this._mouseDownTimeStamp;
                  if (
                    (this._removeMouseDownListeners(),
                    this.selectionText.length <= 1 &&
                      z < 500 &&
                      U.altKey &&
                      this._optionsService.rawOptions.altClickMovesCursor)
                  ) {
                    if (
                      this._bufferService.buffer.ybase ===
                      this._bufferService.buffer.ydisp
                    ) {
                      let k = this._mouseService.getCoords(
                        U,
                        this._element,
                        this._bufferService.cols,
                        this._bufferService.rows,
                        !1
                      );
                      if (k && k[0] !== void 0 && k[1] !== void 0) {
                        let O = (0, J.moveToCellSequence)(
                          k[0] - 1,
                          k[1] - 1,
                          this._bufferService,
                          this._coreService.decPrivateModes
                            .applicationCursorKeys
                        );
                        this._coreService.triggerDataEvent(O, !0);
                      }
                    }
                  } else this._fireEventIfSelectionChanged();
                }
                _fireEventIfSelectionChanged() {
                  let U = this._model.finalSelectionStart,
                    z = this._model.finalSelectionEnd,
                    k = !(!U || !z || (U[0] === z[0] && U[1] === z[1]));
                  k
                    ? U &&
                      z &&
                      ((this._oldSelectionStart &&
                        this._oldSelectionEnd &&
                        U[0] === this._oldSelectionStart[0] &&
                        U[1] === this._oldSelectionStart[1] &&
                        z[0] === this._oldSelectionEnd[0] &&
                        z[1] === this._oldSelectionEnd[1]) ||
                        this._fireOnSelectionChange(U, z, k))
                    : this._oldHasSelection &&
                      this._fireOnSelectionChange(U, z, k);
                }
                _fireOnSelectionChange(U, z, k) {
                  (this._oldSelectionStart = U),
                    (this._oldSelectionEnd = z),
                    (this._oldHasSelection = k),
                    this._onSelectionChange.fire();
                }
                _handleBufferActivate(U) {
                  this.clearSelection(),
                    this._trimListener.dispose(),
                    (this._trimListener = U.activeBuffer.lines.onTrim((z) =>
                      this._handleTrim(z)
                    ));
                }
                _convertViewportColToCharacterIndex(U, z) {
                  let k = z;
                  for (let O = 0; z >= O; O++) {
                    let L = U.loadCell(O, this._workCell).getChars().length;
                    this._workCell.getWidth() === 0
                      ? k--
                      : L > 1 && z !== O && (k += L - 1);
                  }
                  return k;
                }
                setSelection(U, z, k) {
                  this._model.clearSelection(),
                    this._removeMouseDownListeners(),
                    (this._model.selectionStart = [U, z]),
                    (this._model.selectionStartLength = k),
                    this.refresh(),
                    this._fireEventIfSelectionChanged();
                }
                rightClickSelect(U) {
                  this._isClickInSelection(U) ||
                    (this._selectWordAtCursor(U, !1) && this.refresh(!0),
                    this._fireEventIfSelectionChanged());
                }
                _getWordAt(U, z, k = !0, O = !0) {
                  if (U[0] >= this._bufferService.cols) return;
                  let L = this._bufferService.buffer,
                    b = L.lines.get(U[1]);
                  if (!b) return;
                  let B = L.translateBufferLineToString(U[1], !1),
                    S = this._convertViewportColToCharacterIndex(b, U[0]),
                    I = S,
                    R = U[0] - S,
                    D = 0,
                    y = 0,
                    A = 0,
                    v = 0;
                  if (B.charAt(S) === " ") {
                    for (; S > 0 && B.charAt(S - 1) === " "; ) S--;
                    for (; I < B.length && B.charAt(I + 1) === " "; ) I++;
                  } else {
                    let f = U[0],
                      d = U[0];
                    b.getWidth(f) === 0 && (D++, f--),
                      b.getWidth(d) === 2 && (y++, d++);
                    let T = b.getString(d).length;
                    for (
                      T > 1 && ((v += T - 1), (I += T - 1));
                      f > 0 &&
                      S > 0 &&
                      !this._isCharWordSeparator(
                        b.loadCell(f - 1, this._workCell)
                      );
                    ) {
                      b.loadCell(f - 1, this._workCell);
                      let x = this._workCell.getChars().length;
                      this._workCell.getWidth() === 0
                        ? (D++, f--)
                        : x > 1 && ((A += x - 1), (S -= x - 1)),
                        S--,
                        f--;
                    }
                    for (
                      ;
                      d < b.length &&
                      I + 1 < B.length &&
                      !this._isCharWordSeparator(
                        b.loadCell(d + 1, this._workCell)
                      );
                    ) {
                      b.loadCell(d + 1, this._workCell);
                      let x = this._workCell.getChars().length;
                      this._workCell.getWidth() === 2
                        ? (y++, d++)
                        : x > 1 && ((v += x - 1), (I += x - 1)),
                        I++,
                        d++;
                    }
                  }
                  I++;
                  let m = S + R - D + A,
                    p = Math.min(
                      this._bufferService.cols,
                      I - S + D + y - A - v
                    );
                  if (z || B.slice(S, I).trim() !== "") {
                    if (k && m === 0 && b.getCodePoint(0) !== 32) {
                      let f = L.lines.get(U[1] - 1);
                      if (
                        f &&
                        b.isWrapped &&
                        f.getCodePoint(this._bufferService.cols - 1) !== 32
                      ) {
                        let d = this._getWordAt(
                          [this._bufferService.cols - 1, U[1] - 1],
                          !1,
                          !0,
                          !1
                        );
                        if (d) {
                          let T = this._bufferService.cols - d.start;
                          (m -= T), (p += T);
                        }
                      }
                    }
                    if (
                      O &&
                      m + p === this._bufferService.cols &&
                      b.getCodePoint(this._bufferService.cols - 1) !== 32
                    ) {
                      let f = L.lines.get(U[1] + 1);
                      if (
                        (f == null ? void 0 : f.isWrapped) &&
                        f.getCodePoint(0) !== 32
                      ) {
                        let d = this._getWordAt([0, U[1] + 1], !1, !1, !0);
                        d && (p += d.length);
                      }
                    }
                    return { start: m, length: p };
                  }
                }
                _selectWordAt(U, z) {
                  let k = this._getWordAt(U, z);
                  if (k) {
                    for (; k.start < 0; )
                      (k.start += this._bufferService.cols), U[1]--;
                    (this._model.selectionStart = [k.start, U[1]]),
                      (this._model.selectionStartLength = k.length);
                  }
                }
                _selectToWordAt(U) {
                  let z = this._getWordAt(U, !0);
                  if (z) {
                    let k = U[1];
                    for (; z.start < 0; )
                      (z.start += this._bufferService.cols), k--;
                    if (!this._model.areSelectionValuesReversed())
                      for (; z.start + z.length > this._bufferService.cols; )
                        (z.length -= this._bufferService.cols), k++;
                    this._model.selectionEnd = [
                      this._model.areSelectionValuesReversed()
                        ? z.start
                        : z.start + z.length,
                      k,
                    ];
                  }
                }
                _isCharWordSeparator(U) {
                  return (
                    U.getWidth() !== 0 &&
                    this._optionsService.rawOptions.wordSeparator.indexOf(
                      U.getChars()
                    ) >= 0
                  );
                }
                _selectLineAt(U) {
                  let z = this._bufferService.buffer.getWrappedRangeForLine(U),
                    k = {
                      start: { x: 0, y: z.first },
                      end: { x: this._bufferService.cols - 1, y: z.last },
                    };
                  (this._model.selectionStart = [0, z.first]),
                    (this._model.selectionEnd = void 0),
                    (this._model.selectionStartLength = (0, Z.getRangeLength)(
                      k,
                      this._bufferService.cols
                    ));
                }
              });
            H.SelectionService = E = P(
              [
                V(3, F.IBufferService),
                V(4, F.ICoreService),
                V(5, X.IMouseService),
                V(6, F.IOptionsService),
                V(7, X.IRenderService),
                V(8, X.ICoreBrowserService),
              ],
              E
            );
          },
          4725: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.IThemeService =
                H.ICharacterJoinerService =
                H.ISelectionService =
                H.IRenderService =
                H.IMouseService =
                H.ICoreBrowserService =
                H.ICharSizeService =
                  void 0);
            let P = K(8343);
            (H.ICharSizeService = (0, P.createDecorator)("CharSizeService")),
              (H.ICoreBrowserService = (0, P.createDecorator)(
                "CoreBrowserService"
              )),
              (H.IMouseService = (0, P.createDecorator)("MouseService")),
              (H.IRenderService = (0, P.createDecorator)("RenderService")),
              (H.ISelectionService = (0, P.createDecorator)(
                "SelectionService"
              )),
              (H.ICharacterJoinerService = (0, P.createDecorator)(
                "CharacterJoinerService"
              )),
              (H.IThemeService = (0, P.createDecorator)("ThemeService"));
          },
          6731: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (E, U, z, k) {
                  var O,
                    L = arguments.length,
                    b =
                      L < 3
                        ? U
                        : k === null
                          ? (k = Object.getOwnPropertyDescriptor(U, z))
                          : k;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    b = Reflect.decorate(E, U, z, k);
                  else
                    for (var B = E.length - 1; B >= 0; B--)
                      (O = E[B]) &&
                        (b =
                          (L < 3 ? O(b) : L > 3 ? O(U, z, b) : O(U, z)) || b);
                  return L > 3 && b && Object.defineProperty(U, z, b), b;
                },
              V =
                (this && this.__param) ||
                function (E, U) {
                  return function (z, k) {
                    U(z, k, E);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.ThemeService = H.DEFAULT_ANSI_COLORS = void 0);
            let q = K(7239),
              J = K(8055),
              N = K(8460),
              X = K(844),
              G = K(2585),
              Q = J.css.toColor("#ffffff"),
              W = J.css.toColor("#000000"),
              Z = J.css.toColor("#ffffff"),
              Y = J.css.toColor("#000000"),
              F = { css: "rgba(255, 255, 255, 0.3)", rgba: 4294967117 };
            H.DEFAULT_ANSI_COLORS = Object.freeze(
              (() => {
                let E = [
                    J.css.toColor("#2e3436"),
                    J.css.toColor("#cc0000"),
                    J.css.toColor("#4e9a06"),
                    J.css.toColor("#c4a000"),
                    J.css.toColor("#3465a4"),
                    J.css.toColor("#75507b"),
                    J.css.toColor("#06989a"),
                    J.css.toColor("#d3d7cf"),
                    J.css.toColor("#555753"),
                    J.css.toColor("#ef2929"),
                    J.css.toColor("#8ae234"),
                    J.css.toColor("#fce94f"),
                    J.css.toColor("#729fcf"),
                    J.css.toColor("#ad7fa8"),
                    J.css.toColor("#34e2e2"),
                    J.css.toColor("#eeeeec"),
                  ],
                  U = [0, 95, 135, 175, 215, 255];
                for (let z = 0; z < 216; z++) {
                  let k = U[((z / 36) % 6) | 0],
                    O = U[((z / 6) % 6) | 0],
                    L = U[z % 6];
                  E.push({
                    css: J.channels.toCss(k, O, L),
                    rgba: J.channels.toRgba(k, O, L),
                  });
                }
                for (let z = 0; z < 24; z++) {
                  let k = 8 + 10 * z;
                  E.push({
                    css: J.channels.toCss(k, k, k),
                    rgba: J.channels.toRgba(k, k, k),
                  });
                }
                return E;
              })()
            );
            let j = (H.ThemeService = class extends X.Disposable {
              get colors() {
                return this._colors;
              }
              constructor(E) {
                super(),
                  (this._optionsService = E),
                  (this._contrastCache = new q.ColorContrastCache()),
                  (this._halfContrastCache = new q.ColorContrastCache()),
                  (this._onChangeColors = this.register(new N.EventEmitter())),
                  (this.onChangeColors = this._onChangeColors.event),
                  (this._colors = {
                    foreground: Q,
                    background: W,
                    cursor: Z,
                    cursorAccent: Y,
                    selectionForeground: void 0,
                    selectionBackgroundTransparent: F,
                    selectionBackgroundOpaque: J.color.blend(W, F),
                    selectionInactiveBackgroundTransparent: F,
                    selectionInactiveBackgroundOpaque: J.color.blend(W, F),
                    ansi: H.DEFAULT_ANSI_COLORS.slice(),
                    contrastCache: this._contrastCache,
                    halfContrastCache: this._halfContrastCache,
                  }),
                  this._updateRestoreColors(),
                  this._setTheme(this._optionsService.rawOptions.theme),
                  this.register(
                    this._optionsService.onSpecificOptionChange(
                      "minimumContrastRatio",
                      () => this._contrastCache.clear()
                    )
                  ),
                  this.register(
                    this._optionsService.onSpecificOptionChange("theme", () =>
                      this._setTheme(this._optionsService.rawOptions.theme)
                    )
                  );
              }
              _setTheme(E = {}) {
                let U = this._colors;
                if (
                  ((U.foreground = $(E.foreground, Q)),
                  (U.background = $(E.background, W)),
                  (U.cursor = $(E.cursor, Z)),
                  (U.cursorAccent = $(E.cursorAccent, Y)),
                  (U.selectionBackgroundTransparent = $(
                    E.selectionBackground,
                    F
                  )),
                  (U.selectionBackgroundOpaque = J.color.blend(
                    U.background,
                    U.selectionBackgroundTransparent
                  )),
                  (U.selectionInactiveBackgroundTransparent = $(
                    E.selectionInactiveBackground,
                    U.selectionBackgroundTransparent
                  )),
                  (U.selectionInactiveBackgroundOpaque = J.color.blend(
                    U.background,
                    U.selectionInactiveBackgroundTransparent
                  )),
                  (U.selectionForeground = E.selectionForeground
                    ? $(E.selectionForeground, J.NULL_COLOR)
                    : void 0),
                  U.selectionForeground === J.NULL_COLOR &&
                    (U.selectionForeground = void 0),
                  J.color.isOpaque(U.selectionBackgroundTransparent))
                )
                  U.selectionBackgroundTransparent = J.color.opacity(
                    U.selectionBackgroundTransparent,
                    0.3
                  );
                if (J.color.isOpaque(U.selectionInactiveBackgroundTransparent))
                  U.selectionInactiveBackgroundTransparent = J.color.opacity(
                    U.selectionInactiveBackgroundTransparent,
                    0.3
                  );
                if (
                  ((U.ansi = H.DEFAULT_ANSI_COLORS.slice()),
                  (U.ansi[0] = $(E.black, H.DEFAULT_ANSI_COLORS[0])),
                  (U.ansi[1] = $(E.red, H.DEFAULT_ANSI_COLORS[1])),
                  (U.ansi[2] = $(E.green, H.DEFAULT_ANSI_COLORS[2])),
                  (U.ansi[3] = $(E.yellow, H.DEFAULT_ANSI_COLORS[3])),
                  (U.ansi[4] = $(E.blue, H.DEFAULT_ANSI_COLORS[4])),
                  (U.ansi[5] = $(E.magenta, H.DEFAULT_ANSI_COLORS[5])),
                  (U.ansi[6] = $(E.cyan, H.DEFAULT_ANSI_COLORS[6])),
                  (U.ansi[7] = $(E.white, H.DEFAULT_ANSI_COLORS[7])),
                  (U.ansi[8] = $(E.brightBlack, H.DEFAULT_ANSI_COLORS[8])),
                  (U.ansi[9] = $(E.brightRed, H.DEFAULT_ANSI_COLORS[9])),
                  (U.ansi[10] = $(E.brightGreen, H.DEFAULT_ANSI_COLORS[10])),
                  (U.ansi[11] = $(E.brightYellow, H.DEFAULT_ANSI_COLORS[11])),
                  (U.ansi[12] = $(E.brightBlue, H.DEFAULT_ANSI_COLORS[12])),
                  (U.ansi[13] = $(E.brightMagenta, H.DEFAULT_ANSI_COLORS[13])),
                  (U.ansi[14] = $(E.brightCyan, H.DEFAULT_ANSI_COLORS[14])),
                  (U.ansi[15] = $(E.brightWhite, H.DEFAULT_ANSI_COLORS[15])),
                  E.extendedAnsi)
                ) {
                  let z = Math.min(U.ansi.length - 16, E.extendedAnsi.length);
                  for (let k = 0; k < z; k++)
                    U.ansi[k + 16] = $(
                      E.extendedAnsi[k],
                      H.DEFAULT_ANSI_COLORS[k + 16]
                    );
                }
                this._contrastCache.clear(),
                  this._halfContrastCache.clear(),
                  this._updateRestoreColors(),
                  this._onChangeColors.fire(this.colors);
              }
              restoreColor(E) {
                this._restoreColor(E), this._onChangeColors.fire(this.colors);
              }
              _restoreColor(E) {
                if (E !== void 0)
                  switch (E) {
                    case 256:
                      this._colors.foreground = this._restoreColors.foreground;
                      break;
                    case 257:
                      this._colors.background = this._restoreColors.background;
                      break;
                    case 258:
                      this._colors.cursor = this._restoreColors.cursor;
                      break;
                    default:
                      this._colors.ansi[E] = this._restoreColors.ansi[E];
                  }
                else
                  for (let U = 0; U < this._restoreColors.ansi.length; ++U)
                    this._colors.ansi[U] = this._restoreColors.ansi[U];
              }
              modifyColors(E) {
                E(this._colors), this._onChangeColors.fire(this.colors);
              }
              _updateRestoreColors() {
                this._restoreColors = {
                  foreground: this._colors.foreground,
                  background: this._colors.background,
                  cursor: this._colors.cursor,
                  ansi: this._colors.ansi.slice(),
                };
              }
            });
            function $(E, U) {
              if (E !== void 0)
                try {
                  return J.css.toColor(E);
                } catch (z) {}
              return U;
            }
            H.ThemeService = j = P([V(0, G.IOptionsService)], j);
          },
          6349: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.CircularList = void 0);
            let P = K(8460),
              V = K(844);
            class q extends V.Disposable {
              constructor(J) {
                super(),
                  (this._maxLength = J),
                  (this.onDeleteEmitter = this.register(new P.EventEmitter())),
                  (this.onDelete = this.onDeleteEmitter.event),
                  (this.onInsertEmitter = this.register(new P.EventEmitter())),
                  (this.onInsert = this.onInsertEmitter.event),
                  (this.onTrimEmitter = this.register(new P.EventEmitter())),
                  (this.onTrim = this.onTrimEmitter.event),
                  (this._array = Array(this._maxLength)),
                  (this._startIndex = 0),
                  (this._length = 0);
              }
              get maxLength() {
                return this._maxLength;
              }
              set maxLength(J) {
                if (this._maxLength === J) return;
                let N = Array(J);
                for (let X = 0; X < Math.min(J, this.length); X++)
                  N[X] = this._array[this._getCyclicIndex(X)];
                (this._array = N),
                  (this._maxLength = J),
                  (this._startIndex = 0);
              }
              get length() {
                return this._length;
              }
              set length(J) {
                if (J > this._length)
                  for (let N = this._length; N < J; N++)
                    this._array[N] = void 0;
                this._length = J;
              }
              get(J) {
                return this._array[this._getCyclicIndex(J)];
              }
              set(J, N) {
                this._array[this._getCyclicIndex(J)] = N;
              }
              push(J) {
                (this._array[this._getCyclicIndex(this._length)] = J),
                  this._length === this._maxLength
                    ? ((this._startIndex =
                        ++this._startIndex % this._maxLength),
                      this.onTrimEmitter.fire(1))
                    : this._length++;
              }
              recycle() {
                if (this._length !== this._maxLength)
                  throw Error("Can only recycle when the buffer is full");
                return (
                  (this._startIndex = ++this._startIndex % this._maxLength),
                  this.onTrimEmitter.fire(1),
                  this._array[this._getCyclicIndex(this._length - 1)]
                );
              }
              get isFull() {
                return this._length === this._maxLength;
              }
              pop() {
                return this._array[this._getCyclicIndex(this._length-- - 1)];
              }
              splice(J, N, ...X) {
                if (N) {
                  for (let G = J; G < this._length - N; G++)
                    this._array[this._getCyclicIndex(G)] =
                      this._array[this._getCyclicIndex(G + N)];
                  (this._length -= N),
                    this.onDeleteEmitter.fire({ index: J, amount: N });
                }
                for (let G = this._length - 1; G >= J; G--)
                  this._array[this._getCyclicIndex(G + X.length)] =
                    this._array[this._getCyclicIndex(G)];
                for (let G = 0; G < X.length; G++)
                  this._array[this._getCyclicIndex(J + G)] = X[G];
                if (
                  (X.length &&
                    this.onInsertEmitter.fire({ index: J, amount: X.length }),
                  this._length + X.length > this._maxLength)
                ) {
                  let G = this._length + X.length - this._maxLength;
                  (this._startIndex += G),
                    (this._length = this._maxLength),
                    this.onTrimEmitter.fire(G);
                } else this._length += X.length;
              }
              trimStart(J) {
                J > this._length && (J = this._length),
                  (this._startIndex += J),
                  (this._length -= J),
                  this.onTrimEmitter.fire(J);
              }
              shiftElements(J, N, X) {
                if (!(N <= 0)) {
                  if (J < 0 || J >= this._length)
                    throw Error("start argument out of range");
                  if (J + X < 0)
                    throw Error("Cannot shift elements in list beyond index 0");
                  if (X > 0) {
                    for (let Q = N - 1; Q >= 0; Q--)
                      this.set(J + Q + X, this.get(J + Q));
                    let G = J + N + X - this._length;
                    if (G > 0)
                      for (this._length += G; this._length > this._maxLength; )
                        this._length--,
                          this._startIndex++,
                          this.onTrimEmitter.fire(1);
                  } else
                    for (let G = 0; G < N; G++)
                      this.set(J + G + X, this.get(J + G));
                }
              }
              _getCyclicIndex(J) {
                return (this._startIndex + J) % this._maxLength;
              }
            }
            H.CircularList = q;
          },
          1439: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.clone = void 0),
              (H.clone = function K(P, V = 5) {
                if (typeof P != "object") return P;
                let q = Array.isArray(P) ? [] : {};
                for (let J in P) q[J] = V <= 1 ? P[J] : P[J] && K(P[J], V - 1);
                return q;
              });
          },
          8055: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.contrastRatio =
                H.toPaddedHex =
                H.rgba =
                H.rgb =
                H.css =
                H.color =
                H.channels =
                H.NULL_COLOR =
                  void 0);
            let P = K(6114),
              V = 0,
              q = 0,
              J = 0,
              N = 0;
            var X, G, Q, W, Z;
            function Y(j) {
              let $ = j.toString(16);
              return $.length < 2 ? "0" + $ : $;
            }
            function F(j, $) {
              return j < $ ? ($ + 0.05) / (j + 0.05) : (j + 0.05) / ($ + 0.05);
            }
            (H.NULL_COLOR = { css: "#00000000", rgba: 0 }),
              (function (j) {
                (j.toCss = function ($, E, U, z) {
                  return z !== void 0
                    ? `#${Y($)}${Y(E)}${Y(U)}${Y(z)}`
                    : `#${Y($)}${Y(E)}${Y(U)}`;
                }),
                  (j.toRgba = function ($, E, U, z = 255) {
                    return (($ << 24) | (E << 16) | (U << 8) | z) >>> 0;
                  });
              })(X || (H.channels = X = {})),
              (function (j) {
                function $(E, U) {
                  return (
                    (N = Math.round(255 * U)),
                    ([V, q, J] = Z.toChannels(E.rgba)),
                    { css: X.toCss(V, q, J, N), rgba: X.toRgba(V, q, J, N) }
                  );
                }
                (j.blend = function (E, U) {
                  if (((N = (255 & U.rgba) / 255), N === 1))
                    return { css: U.css, rgba: U.rgba };
                  let z = (U.rgba >> 24) & 255,
                    k = (U.rgba >> 16) & 255,
                    O = (U.rgba >> 8) & 255,
                    L = (E.rgba >> 24) & 255,
                    b = (E.rgba >> 16) & 255,
                    B = (E.rgba >> 8) & 255;
                  return (
                    (V = L + Math.round((z - L) * N)),
                    (q = b + Math.round((k - b) * N)),
                    (J = B + Math.round((O - B) * N)),
                    { css: X.toCss(V, q, J), rgba: X.toRgba(V, q, J) }
                  );
                }),
                  (j.isOpaque = function (E) {
                    return (255 & E.rgba) == 255;
                  }),
                  (j.ensureContrastRatio = function (E, U, z) {
                    let k = Z.ensureContrastRatio(E.rgba, U.rgba, z);
                    if (k)
                      return Z.toColor(
                        (k >> 24) & 255,
                        (k >> 16) & 255,
                        (k >> 8) & 255
                      );
                  }),
                  (j.opaque = function (E) {
                    let U = (255 | E.rgba) >>> 0;
                    return (
                      ([V, q, J] = Z.toChannels(U)),
                      { css: X.toCss(V, q, J), rgba: U }
                    );
                  }),
                  (j.opacity = $),
                  (j.multiplyOpacity = function (E, U) {
                    return (N = 255 & E.rgba), $(E, (N * U) / 255);
                  }),
                  (j.toColorRGB = function (E) {
                    return [
                      (E.rgba >> 24) & 255,
                      (E.rgba >> 16) & 255,
                      (E.rgba >> 8) & 255,
                    ];
                  });
              })(G || (H.color = G = {})),
              (function (j) {
                let $, E;
                if (!P.isNode) {
                  let U = document.createElement("canvas");
                  (U.width = 1), (U.height = 1);
                  let z = U.getContext("2d", { willReadFrequently: !0 });
                  z &&
                    (($ = z),
                    ($.globalCompositeOperation = "copy"),
                    (E = $.createLinearGradient(0, 0, 1, 1)));
                }
                j.toColor = function (U) {
                  if (U.match(/#[\da-f]{3,8}/i))
                    switch (U.length) {
                      case 4:
                        return (
                          (V = parseInt(U.slice(1, 2).repeat(2), 16)),
                          (q = parseInt(U.slice(2, 3).repeat(2), 16)),
                          (J = parseInt(U.slice(3, 4).repeat(2), 16)),
                          Z.toColor(V, q, J)
                        );
                      case 5:
                        return (
                          (V = parseInt(U.slice(1, 2).repeat(2), 16)),
                          (q = parseInt(U.slice(2, 3).repeat(2), 16)),
                          (J = parseInt(U.slice(3, 4).repeat(2), 16)),
                          (N = parseInt(U.slice(4, 5).repeat(2), 16)),
                          Z.toColor(V, q, J, N)
                        );
                      case 7:
                        return {
                          css: U,
                          rgba: ((parseInt(U.slice(1), 16) << 8) | 255) >>> 0,
                        };
                      case 9:
                        return { css: U, rgba: parseInt(U.slice(1), 16) >>> 0 };
                    }
                  let z = U.match(
                    /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|\d?\.(\d+))\s*)?\)/
                  );
                  if (z)
                    return (
                      (V = parseInt(z[1])),
                      (q = parseInt(z[2])),
                      (J = parseInt(z[3])),
                      (N = Math.round(
                        255 * (z[5] === void 0 ? 1 : parseFloat(z[5]))
                      )),
                      Z.toColor(V, q, J, N)
                    );
                  if (!$ || !E)
                    throw Error("css.toColor: Unsupported css format");
                  if (
                    (($.fillStyle = E),
                    ($.fillStyle = U),
                    typeof $.fillStyle != "string")
                  )
                    throw Error("css.toColor: Unsupported css format");
                  if (
                    ($.fillRect(0, 0, 1, 1),
                    ([V, q, J, N] = $.getImageData(0, 0, 1, 1).data),
                    N !== 255)
                  )
                    throw Error("css.toColor: Unsupported css format");
                  return { rgba: X.toRgba(V, q, J, N), css: U };
                };
              })(Q || (H.css = Q = {})),
              (function (j) {
                function $(E, U, z) {
                  let k = E / 255,
                    O = U / 255,
                    L = z / 255;
                  return (
                    0.2126 *
                      (k <= 0.03928
                        ? k / 12.92
                        : Math.pow((k + 0.055) / 1.055, 2.4)) +
                    0.7152 *
                      (O <= 0.03928
                        ? O / 12.92
                        : Math.pow((O + 0.055) / 1.055, 2.4)) +
                    0.0722 *
                      (L <= 0.03928
                        ? L / 12.92
                        : Math.pow((L + 0.055) / 1.055, 2.4))
                  );
                }
                (j.relativeLuminance = function (E) {
                  return $((E >> 16) & 255, (E >> 8) & 255, 255 & E);
                }),
                  (j.relativeLuminance2 = $);
              })(W || (H.rgb = W = {})),
              (function (j) {
                function $(U, z, k) {
                  let O = (U >> 24) & 255,
                    L = (U >> 16) & 255,
                    b = (U >> 8) & 255,
                    B = (z >> 24) & 255,
                    S = (z >> 16) & 255,
                    I = (z >> 8) & 255,
                    R = F(
                      W.relativeLuminance2(B, S, I),
                      W.relativeLuminance2(O, L, b)
                    );
                  for (; R < k && (B > 0 || S > 0 || I > 0); )
                    (B -= Math.max(0, Math.ceil(0.1 * B))),
                      (S -= Math.max(0, Math.ceil(0.1 * S))),
                      (I -= Math.max(0, Math.ceil(0.1 * I))),
                      (R = F(
                        W.relativeLuminance2(B, S, I),
                        W.relativeLuminance2(O, L, b)
                      ));
                  return ((B << 24) | (S << 16) | (I << 8) | 255) >>> 0;
                }
                function E(U, z, k) {
                  let O = (U >> 24) & 255,
                    L = (U >> 16) & 255,
                    b = (U >> 8) & 255,
                    B = (z >> 24) & 255,
                    S = (z >> 16) & 255,
                    I = (z >> 8) & 255,
                    R = F(
                      W.relativeLuminance2(B, S, I),
                      W.relativeLuminance2(O, L, b)
                    );
                  for (; R < k && (B < 255 || S < 255 || I < 255); )
                    (B = Math.min(255, B + Math.ceil(0.1 * (255 - B)))),
                      (S = Math.min(255, S + Math.ceil(0.1 * (255 - S)))),
                      (I = Math.min(255, I + Math.ceil(0.1 * (255 - I)))),
                      (R = F(
                        W.relativeLuminance2(B, S, I),
                        W.relativeLuminance2(O, L, b)
                      ));
                  return ((B << 24) | (S << 16) | (I << 8) | 255) >>> 0;
                }
                (j.ensureContrastRatio = function (U, z, k) {
                  let O = W.relativeLuminance(U >> 8),
                    L = W.relativeLuminance(z >> 8);
                  if (F(O, L) < k) {
                    if (L < O) {
                      let S = $(U, z, k),
                        I = F(O, W.relativeLuminance(S >> 8));
                      if (I < k) {
                        let R = E(U, z, k);
                        return I > F(O, W.relativeLuminance(R >> 8)) ? S : R;
                      }
                      return S;
                    }
                    let b = E(U, z, k),
                      B = F(O, W.relativeLuminance(b >> 8));
                    if (B < k) {
                      let S = $(U, z, k);
                      return B > F(O, W.relativeLuminance(S >> 8)) ? b : S;
                    }
                    return b;
                  }
                }),
                  (j.reduceLuminance = $),
                  (j.increaseLuminance = E),
                  (j.toChannels = function (U) {
                    return [
                      (U >> 24) & 255,
                      (U >> 16) & 255,
                      (U >> 8) & 255,
                      255 & U,
                    ];
                  }),
                  (j.toColor = function (U, z, k, O) {
                    return {
                      css: X.toCss(U, z, k, O),
                      rgba: X.toRgba(U, z, k, O),
                    };
                  });
              })(Z || (H.rgba = Z = {})),
              (H.toPaddedHex = Y),
              (H.contrastRatio = F);
          },
          8969: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.CoreTerminal = void 0);
            let P = K(844),
              V = K(2585),
              q = K(4348),
              J = K(7866),
              N = K(744),
              X = K(7302),
              G = K(6975),
              Q = K(8460),
              W = K(1753),
              Z = K(1480),
              Y = K(7994),
              F = K(9282),
              j = K(5435),
              $ = K(5981),
              E = K(2660),
              U = !1;
            class z extends P.Disposable {
              get onScroll() {
                return (
                  this._onScrollApi ||
                    ((this._onScrollApi = this.register(new Q.EventEmitter())),
                    this._onScroll.event((k) => {
                      var O;
                      (O = this._onScrollApi) === null ||
                        O === void 0 ||
                        O.fire(k.position);
                    })),
                  this._onScrollApi.event
                );
              }
              get cols() {
                return this._bufferService.cols;
              }
              get rows() {
                return this._bufferService.rows;
              }
              get buffers() {
                return this._bufferService.buffers;
              }
              get options() {
                return this.optionsService.options;
              }
              set options(k) {
                for (let O in k) this.optionsService.options[O] = k[O];
              }
              constructor(k) {
                super(),
                  (this._windowsWrappingHeuristics = this.register(
                    new P.MutableDisposable()
                  )),
                  (this._onBinary = this.register(new Q.EventEmitter())),
                  (this.onBinary = this._onBinary.event),
                  (this._onData = this.register(new Q.EventEmitter())),
                  (this.onData = this._onData.event),
                  (this._onLineFeed = this.register(new Q.EventEmitter())),
                  (this.onLineFeed = this._onLineFeed.event),
                  (this._onResize = this.register(new Q.EventEmitter())),
                  (this.onResize = this._onResize.event),
                  (this._onWriteParsed = this.register(new Q.EventEmitter())),
                  (this.onWriteParsed = this._onWriteParsed.event),
                  (this._onScroll = this.register(new Q.EventEmitter())),
                  (this._instantiationService = new q.InstantiationService()),
                  (this.optionsService = this.register(
                    new X.OptionsService(k)
                  )),
                  this._instantiationService.setService(
                    V.IOptionsService,
                    this.optionsService
                  ),
                  (this._bufferService = this.register(
                    this._instantiationService.createInstance(N.BufferService)
                  )),
                  this._instantiationService.setService(
                    V.IBufferService,
                    this._bufferService
                  ),
                  (this._logService = this.register(
                    this._instantiationService.createInstance(J.LogService)
                  )),
                  this._instantiationService.setService(
                    V.ILogService,
                    this._logService
                  ),
                  (this.coreService = this.register(
                    this._instantiationService.createInstance(G.CoreService)
                  )),
                  this._instantiationService.setService(
                    V.ICoreService,
                    this.coreService
                  ),
                  (this.coreMouseService = this.register(
                    this._instantiationService.createInstance(
                      W.CoreMouseService
                    )
                  )),
                  this._instantiationService.setService(
                    V.ICoreMouseService,
                    this.coreMouseService
                  ),
                  (this.unicodeService = this.register(
                    this._instantiationService.createInstance(Z.UnicodeService)
                  )),
                  this._instantiationService.setService(
                    V.IUnicodeService,
                    this.unicodeService
                  ),
                  (this._charsetService =
                    this._instantiationService.createInstance(
                      Y.CharsetService
                    )),
                  this._instantiationService.setService(
                    V.ICharsetService,
                    this._charsetService
                  ),
                  (this._oscLinkService =
                    this._instantiationService.createInstance(
                      E.OscLinkService
                    )),
                  this._instantiationService.setService(
                    V.IOscLinkService,
                    this._oscLinkService
                  ),
                  (this._inputHandler = this.register(
                    new j.InputHandler(
                      this._bufferService,
                      this._charsetService,
                      this.coreService,
                      this._logService,
                      this.optionsService,
                      this._oscLinkService,
                      this.coreMouseService,
                      this.unicodeService
                    )
                  )),
                  this.register(
                    (0, Q.forwardEvent)(
                      this._inputHandler.onLineFeed,
                      this._onLineFeed
                    )
                  ),
                  this.register(this._inputHandler),
                  this.register(
                    (0, Q.forwardEvent)(
                      this._bufferService.onResize,
                      this._onResize
                    )
                  ),
                  this.register(
                    (0, Q.forwardEvent)(this.coreService.onData, this._onData)
                  ),
                  this.register(
                    (0, Q.forwardEvent)(
                      this.coreService.onBinary,
                      this._onBinary
                    )
                  ),
                  this.register(
                    this.coreService.onRequestScrollToBottom(() =>
                      this.scrollToBottom()
                    )
                  ),
                  this.register(
                    this.coreService.onUserInput(() =>
                      this._writeBuffer.handleUserInput()
                    )
                  ),
                  this.register(
                    this.optionsService.onMultipleOptionChange(
                      ["windowsMode", "windowsPty"],
                      () => this._handleWindowsPtyOptionChange()
                    )
                  ),
                  this.register(
                    this._bufferService.onScroll((O) => {
                      this._onScroll.fire({
                        position: this._bufferService.buffer.ydisp,
                        source: 0,
                      }),
                        this._inputHandler.markRangeDirty(
                          this._bufferService.buffer.scrollTop,
                          this._bufferService.buffer.scrollBottom
                        );
                    })
                  ),
                  this.register(
                    this._inputHandler.onScroll((O) => {
                      this._onScroll.fire({
                        position: this._bufferService.buffer.ydisp,
                        source: 0,
                      }),
                        this._inputHandler.markRangeDirty(
                          this._bufferService.buffer.scrollTop,
                          this._bufferService.buffer.scrollBottom
                        );
                    })
                  ),
                  (this._writeBuffer = this.register(
                    new $.WriteBuffer((O, L) => this._inputHandler.parse(O, L))
                  )),
                  this.register(
                    (0, Q.forwardEvent)(
                      this._writeBuffer.onWriteParsed,
                      this._onWriteParsed
                    )
                  );
              }
              write(k, O) {
                this._writeBuffer.write(k, O);
              }
              writeSync(k, O) {
                this._logService.logLevel <= V.LogLevelEnum.WARN &&
                  !U &&
                  (this._logService.warn(
                    "writeSync is unreliable and will be removed soon."
                  ),
                  (U = !0)),
                  this._writeBuffer.writeSync(k, O);
              }
              resize(k, O) {
                isNaN(k) ||
                  isNaN(O) ||
                  ((k = Math.max(k, N.MINIMUM_COLS)),
                  (O = Math.max(O, N.MINIMUM_ROWS)),
                  this._bufferService.resize(k, O));
              }
              scroll(k, O = !1) {
                this._bufferService.scroll(k, O);
              }
              scrollLines(k, O, L) {
                this._bufferService.scrollLines(k, O, L);
              }
              scrollPages(k) {
                this.scrollLines(k * (this.rows - 1));
              }
              scrollToTop() {
                this.scrollLines(-this._bufferService.buffer.ydisp);
              }
              scrollToBottom() {
                this.scrollLines(
                  this._bufferService.buffer.ybase -
                    this._bufferService.buffer.ydisp
                );
              }
              scrollToLine(k) {
                let O = k - this._bufferService.buffer.ydisp;
                O !== 0 && this.scrollLines(O);
              }
              registerEscHandler(k, O) {
                return this._inputHandler.registerEscHandler(k, O);
              }
              registerDcsHandler(k, O) {
                return this._inputHandler.registerDcsHandler(k, O);
              }
              registerCsiHandler(k, O) {
                return this._inputHandler.registerCsiHandler(k, O);
              }
              registerOscHandler(k, O) {
                return this._inputHandler.registerOscHandler(k, O);
              }
              _setup() {
                this._handleWindowsPtyOptionChange();
              }
              reset() {
                this._inputHandler.reset(),
                  this._bufferService.reset(),
                  this._charsetService.reset(),
                  this.coreService.reset(),
                  this.coreMouseService.reset();
              }
              _handleWindowsPtyOptionChange() {
                let k = !1,
                  O = this.optionsService.rawOptions.windowsPty;
                O && O.buildNumber !== void 0 && O.buildNumber !== void 0
                  ? (k = O.backend === "conpty" && O.buildNumber < 21376)
                  : this.optionsService.rawOptions.windowsMode && (k = !0),
                  k
                    ? this._enableWindowsWrappingHeuristics()
                    : this._windowsWrappingHeuristics.clear();
              }
              _enableWindowsWrappingHeuristics() {
                if (!this._windowsWrappingHeuristics.value) {
                  let k = [];
                  k.push(
                    this.onLineFeed(
                      F.updateWindowsModeWrappedState.bind(
                        null,
                        this._bufferService
                      )
                    )
                  ),
                    k.push(
                      this.registerCsiHandler(
                        { final: "H" },
                        () => (
                          (0, F.updateWindowsModeWrappedState)(
                            this._bufferService
                          ),
                          !1
                        )
                      )
                    ),
                    (this._windowsWrappingHeuristics.value = (0,
                    P.toDisposable)(() => {
                      for (let O of k) O.dispose();
                    }));
                }
              }
            }
            H.CoreTerminal = z;
          },
          8460: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.forwardEvent = H.EventEmitter = void 0),
              (H.EventEmitter = class {
                constructor() {
                  (this._listeners = []), (this._disposed = !1);
                }
                get event() {
                  return (
                    this._event ||
                      (this._event = (K) => (
                        this._listeners.push(K),
                        {
                          dispose: () => {
                            if (!this._disposed) {
                              for (let P = 0; P < this._listeners.length; P++)
                                if (this._listeners[P] === K)
                                  return void this._listeners.splice(P, 1);
                            }
                          },
                        }
                      )),
                    this._event
                  );
                }
                fire(K, P) {
                  let V = [];
                  for (let q = 0; q < this._listeners.length; q++)
                    V.push(this._listeners[q]);
                  for (let q = 0; q < V.length; q++) V[q].call(void 0, K, P);
                }
                dispose() {
                  this.clearListeners(), (this._disposed = !0);
                }
                clearListeners() {
                  this._listeners && (this._listeners.length = 0);
                }
              }),
              (H.forwardEvent = function (K, P) {
                return K((V) => P.fire(V));
              });
          },
          5435: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (R, D, y, A) {
                  var v,
                    m = arguments.length,
                    p =
                      m < 3
                        ? D
                        : A === null
                          ? (A = Object.getOwnPropertyDescriptor(D, y))
                          : A;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    p = Reflect.decorate(R, D, y, A);
                  else
                    for (var f = R.length - 1; f >= 0; f--)
                      (v = R[f]) &&
                        (p =
                          (m < 3 ? v(p) : m > 3 ? v(D, y, p) : v(D, y)) || p);
                  return m > 3 && p && Object.defineProperty(D, y, p), p;
                },
              V =
                (this && this.__param) ||
                function (R, D) {
                  return function (y, A) {
                    D(y, A, R);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.InputHandler = H.WindowsOptionsReportType = void 0);
            let q = K(2584),
              J = K(7116),
              N = K(2015),
              X = K(844),
              G = K(482),
              Q = K(8437),
              W = K(8460),
              Z = K(643),
              Y = K(511),
              F = K(3734),
              j = K(2585),
              $ = K(6242),
              E = K(6351),
              U = K(5941),
              z = { "(": 0, ")": 1, "*": 2, "+": 3, "-": 1, ".": 2 },
              k = 131072;
            function O(R, D) {
              if (R > 24) return D.setWinLines || !1;
              switch (R) {
                case 1:
                  return !!D.restoreWin;
                case 2:
                  return !!D.minimizeWin;
                case 3:
                  return !!D.setWinPosition;
                case 4:
                  return !!D.setWinSizePixels;
                case 5:
                  return !!D.raiseWin;
                case 6:
                  return !!D.lowerWin;
                case 7:
                  return !!D.refreshWin;
                case 8:
                  return !!D.setWinSizeChars;
                case 9:
                  return !!D.maximizeWin;
                case 10:
                  return !!D.fullscreenWin;
                case 11:
                  return !!D.getWinState;
                case 13:
                  return !!D.getWinPosition;
                case 14:
                  return !!D.getWinSizePixels;
                case 15:
                  return !!D.getScreenSizePixels;
                case 16:
                  return !!D.getCellSizePixels;
                case 18:
                  return !!D.getWinSizeChars;
                case 19:
                  return !!D.getScreenSizeChars;
                case 20:
                  return !!D.getIconTitle;
                case 21:
                  return !!D.getWinTitle;
                case 22:
                  return !!D.pushTitle;
                case 23:
                  return !!D.popTitle;
                case 24:
                  return !!D.setWinLines;
              }
              return !1;
            }
            var L;
            (function (R) {
              (R[(R.GET_WIN_SIZE_PIXELS = 0)] = "GET_WIN_SIZE_PIXELS"),
                (R[(R.GET_CELL_SIZE_PIXELS = 1)] = "GET_CELL_SIZE_PIXELS");
            })(L || (H.WindowsOptionsReportType = L = {}));
            let b = 0;
            class B extends X.Disposable {
              getAttrData() {
                return this._curAttrData;
              }
              constructor(
                R,
                D,
                y,
                A,
                v,
                m,
                p,
                f,
                d = new N.EscapeSequenceParser()
              ) {
                super(),
                  (this._bufferService = R),
                  (this._charsetService = D),
                  (this._coreService = y),
                  (this._logService = A),
                  (this._optionsService = v),
                  (this._oscLinkService = m),
                  (this._coreMouseService = p),
                  (this._unicodeService = f),
                  (this._parser = d),
                  (this._parseBuffer = new Uint32Array(4096)),
                  (this._stringDecoder = new G.StringToUtf32()),
                  (this._utf8Decoder = new G.Utf8ToUtf32()),
                  (this._workCell = new Y.CellData()),
                  (this._windowTitle = ""),
                  (this._iconName = ""),
                  (this._windowTitleStack = []),
                  (this._iconNameStack = []),
                  (this._curAttrData = Q.DEFAULT_ATTR_DATA.clone()),
                  (this._eraseAttrDataInternal = Q.DEFAULT_ATTR_DATA.clone()),
                  (this._onRequestBell = this.register(new W.EventEmitter())),
                  (this.onRequestBell = this._onRequestBell.event),
                  (this._onRequestRefreshRows = this.register(
                    new W.EventEmitter()
                  )),
                  (this.onRequestRefreshRows =
                    this._onRequestRefreshRows.event),
                  (this._onRequestReset = this.register(new W.EventEmitter())),
                  (this.onRequestReset = this._onRequestReset.event),
                  (this._onRequestSendFocus = this.register(
                    new W.EventEmitter()
                  )),
                  (this.onRequestSendFocus = this._onRequestSendFocus.event),
                  (this._onRequestSyncScrollBar = this.register(
                    new W.EventEmitter()
                  )),
                  (this.onRequestSyncScrollBar =
                    this._onRequestSyncScrollBar.event),
                  (this._onRequestWindowsOptionsReport = this.register(
                    new W.EventEmitter()
                  )),
                  (this.onRequestWindowsOptionsReport =
                    this._onRequestWindowsOptionsReport.event),
                  (this._onA11yChar = this.register(new W.EventEmitter())),
                  (this.onA11yChar = this._onA11yChar.event),
                  (this._onA11yTab = this.register(new W.EventEmitter())),
                  (this.onA11yTab = this._onA11yTab.event),
                  (this._onCursorMove = this.register(new W.EventEmitter())),
                  (this.onCursorMove = this._onCursorMove.event),
                  (this._onLineFeed = this.register(new W.EventEmitter())),
                  (this.onLineFeed = this._onLineFeed.event),
                  (this._onScroll = this.register(new W.EventEmitter())),
                  (this.onScroll = this._onScroll.event),
                  (this._onTitleChange = this.register(new W.EventEmitter())),
                  (this.onTitleChange = this._onTitleChange.event),
                  (this._onColor = this.register(new W.EventEmitter())),
                  (this.onColor = this._onColor.event),
                  (this._parseStack = {
                    paused: !1,
                    cursorStartX: 0,
                    cursorStartY: 0,
                    decodedLength: 0,
                    position: 0,
                  }),
                  (this._specialColors = [256, 257, 258]),
                  this.register(this._parser),
                  (this._dirtyRowTracker = new S(this._bufferService)),
                  (this._activeBuffer = this._bufferService.buffer),
                  this.register(
                    this._bufferService.buffers.onBufferActivate(
                      (T) => (this._activeBuffer = T.activeBuffer)
                    )
                  ),
                  this._parser.setCsiHandlerFallback((T, x) => {
                    this._logService.debug("Unknown CSI code: ", {
                      identifier: this._parser.identToString(T),
                      params: x.toArray(),
                    });
                  }),
                  this._parser.setEscHandlerFallback((T) => {
                    this._logService.debug("Unknown ESC code: ", {
                      identifier: this._parser.identToString(T),
                    });
                  }),
                  this._parser.setExecuteHandlerFallback((T) => {
                    this._logService.debug("Unknown EXECUTE code: ", {
                      code: T,
                    });
                  }),
                  this._parser.setOscHandlerFallback((T, x, C) => {
                    this._logService.debug("Unknown OSC code: ", {
                      identifier: T,
                      action: x,
                      data: C,
                    });
                  }),
                  this._parser.setDcsHandlerFallback((T, x, C) => {
                    x === "HOOK" && (C = C.toArray()),
                      this._logService.debug("Unknown DCS code: ", {
                        identifier: this._parser.identToString(T),
                        action: x,
                        payload: C,
                      });
                  }),
                  this._parser.setPrintHandler((T, x, C) =>
                    this.print(T, x, C)
                  ),
                  this._parser.registerCsiHandler({ final: "@" }, (T) =>
                    this.insertChars(T)
                  ),
                  this._parser.registerCsiHandler(
                    { intermediates: " ", final: "@" },
                    (T) => this.scrollLeft(T)
                  ),
                  this._parser.registerCsiHandler({ final: "A" }, (T) =>
                    this.cursorUp(T)
                  ),
                  this._parser.registerCsiHandler(
                    { intermediates: " ", final: "A" },
                    (T) => this.scrollRight(T)
                  ),
                  this._parser.registerCsiHandler({ final: "B" }, (T) =>
                    this.cursorDown(T)
                  ),
                  this._parser.registerCsiHandler({ final: "C" }, (T) =>
                    this.cursorForward(T)
                  ),
                  this._parser.registerCsiHandler({ final: "D" }, (T) =>
                    this.cursorBackward(T)
                  ),
                  this._parser.registerCsiHandler({ final: "E" }, (T) =>
                    this.cursorNextLine(T)
                  ),
                  this._parser.registerCsiHandler({ final: "F" }, (T) =>
                    this.cursorPrecedingLine(T)
                  ),
                  this._parser.registerCsiHandler({ final: "G" }, (T) =>
                    this.cursorCharAbsolute(T)
                  ),
                  this._parser.registerCsiHandler({ final: "H" }, (T) =>
                    this.cursorPosition(T)
                  ),
                  this._parser.registerCsiHandler({ final: "I" }, (T) =>
                    this.cursorForwardTab(T)
                  ),
                  this._parser.registerCsiHandler({ final: "J" }, (T) =>
                    this.eraseInDisplay(T, !1)
                  ),
                  this._parser.registerCsiHandler(
                    { prefix: "?", final: "J" },
                    (T) => this.eraseInDisplay(T, !0)
                  ),
                  this._parser.registerCsiHandler({ final: "K" }, (T) =>
                    this.eraseInLine(T, !1)
                  ),
                  this._parser.registerCsiHandler(
                    { prefix: "?", final: "K" },
                    (T) => this.eraseInLine(T, !0)
                  ),
                  this._parser.registerCsiHandler({ final: "L" }, (T) =>
                    this.insertLines(T)
                  ),
                  this._parser.registerCsiHandler({ final: "M" }, (T) =>
                    this.deleteLines(T)
                  ),
                  this._parser.registerCsiHandler({ final: "P" }, (T) =>
                    this.deleteChars(T)
                  ),
                  this._parser.registerCsiHandler({ final: "S" }, (T) =>
                    this.scrollUp(T)
                  ),
                  this._parser.registerCsiHandler({ final: "T" }, (T) =>
                    this.scrollDown(T)
                  ),
                  this._parser.registerCsiHandler({ final: "X" }, (T) =>
                    this.eraseChars(T)
                  ),
                  this._parser.registerCsiHandler({ final: "Z" }, (T) =>
                    this.cursorBackwardTab(T)
                  ),
                  this._parser.registerCsiHandler({ final: "`" }, (T) =>
                    this.charPosAbsolute(T)
                  ),
                  this._parser.registerCsiHandler({ final: "a" }, (T) =>
                    this.hPositionRelative(T)
                  ),
                  this._parser.registerCsiHandler({ final: "b" }, (T) =>
                    this.repeatPrecedingCharacter(T)
                  ),
                  this._parser.registerCsiHandler({ final: "c" }, (T) =>
                    this.sendDeviceAttributesPrimary(T)
                  ),
                  this._parser.registerCsiHandler(
                    { prefix: ">", final: "c" },
                    (T) => this.sendDeviceAttributesSecondary(T)
                  ),
                  this._parser.registerCsiHandler({ final: "d" }, (T) =>
                    this.linePosAbsolute(T)
                  ),
                  this._parser.registerCsiHandler({ final: "e" }, (T) =>
                    this.vPositionRelative(T)
                  ),
                  this._parser.registerCsiHandler({ final: "f" }, (T) =>
                    this.hVPosition(T)
                  ),
                  this._parser.registerCsiHandler({ final: "g" }, (T) =>
                    this.tabClear(T)
                  ),
                  this._parser.registerCsiHandler({ final: "h" }, (T) =>
                    this.setMode(T)
                  ),
                  this._parser.registerCsiHandler(
                    { prefix: "?", final: "h" },
                    (T) => this.setModePrivate(T)
                  ),
                  this._parser.registerCsiHandler({ final: "l" }, (T) =>
                    this.resetMode(T)
                  ),
                  this._parser.registerCsiHandler(
                    { prefix: "?", final: "l" },
                    (T) => this.resetModePrivate(T)
                  ),
                  this._parser.registerCsiHandler({ final: "m" }, (T) =>
                    this.charAttributes(T)
                  ),
                  this._parser.registerCsiHandler({ final: "n" }, (T) =>
                    this.deviceStatus(T)
                  ),
                  this._parser.registerCsiHandler(
                    { prefix: "?", final: "n" },
                    (T) => this.deviceStatusPrivate(T)
                  ),
                  this._parser.registerCsiHandler(
                    { intermediates: "!", final: "p" },
                    (T) => this.softReset(T)
                  ),
                  this._parser.registerCsiHandler(
                    { intermediates: " ", final: "q" },
                    (T) => this.setCursorStyle(T)
                  ),
                  this._parser.registerCsiHandler({ final: "r" }, (T) =>
                    this.setScrollRegion(T)
                  ),
                  this._parser.registerCsiHandler({ final: "s" }, (T) =>
                    this.saveCursor(T)
                  ),
                  this._parser.registerCsiHandler({ final: "t" }, (T) =>
                    this.windowOptions(T)
                  ),
                  this._parser.registerCsiHandler({ final: "u" }, (T) =>
                    this.restoreCursor(T)
                  ),
                  this._parser.registerCsiHandler(
                    { intermediates: "'", final: "}" },
                    (T) => this.insertColumns(T)
                  ),
                  this._parser.registerCsiHandler(
                    { intermediates: "'", final: "~" },
                    (T) => this.deleteColumns(T)
                  ),
                  this._parser.registerCsiHandler(
                    { intermediates: '"', final: "q" },
                    (T) => this.selectProtected(T)
                  ),
                  this._parser.registerCsiHandler(
                    { intermediates: "$", final: "p" },
                    (T) => this.requestMode(T, !0)
                  ),
                  this._parser.registerCsiHandler(
                    { prefix: "?", intermediates: "$", final: "p" },
                    (T) => this.requestMode(T, !1)
                  ),
                  this._parser.setExecuteHandler(q.C0.BEL, () => this.bell()),
                  this._parser.setExecuteHandler(q.C0.LF, () =>
                    this.lineFeed()
                  ),
                  this._parser.setExecuteHandler(q.C0.VT, () =>
                    this.lineFeed()
                  ),
                  this._parser.setExecuteHandler(q.C0.FF, () =>
                    this.lineFeed()
                  ),
                  this._parser.setExecuteHandler(q.C0.CR, () =>
                    this.carriageReturn()
                  ),
                  this._parser.setExecuteHandler(q.C0.BS, () =>
                    this.backspace()
                  ),
                  this._parser.setExecuteHandler(q.C0.HT, () => this.tab()),
                  this._parser.setExecuteHandler(q.C0.SO, () =>
                    this.shiftOut()
                  ),
                  this._parser.setExecuteHandler(q.C0.SI, () => this.shiftIn()),
                  this._parser.setExecuteHandler(q.C1.IND, () => this.index()),
                  this._parser.setExecuteHandler(q.C1.NEL, () =>
                    this.nextLine()
                  ),
                  this._parser.setExecuteHandler(q.C1.HTS, () => this.tabSet()),
                  this._parser.registerOscHandler(
                    0,
                    new $.OscHandler(
                      (T) => (this.setTitle(T), this.setIconName(T), !0)
                    )
                  ),
                  this._parser.registerOscHandler(
                    1,
                    new $.OscHandler((T) => this.setIconName(T))
                  ),
                  this._parser.registerOscHandler(
                    2,
                    new $.OscHandler((T) => this.setTitle(T))
                  ),
                  this._parser.registerOscHandler(
                    4,
                    new $.OscHandler((T) => this.setOrReportIndexedColor(T))
                  ),
                  this._parser.registerOscHandler(
                    8,
                    new $.OscHandler((T) => this.setHyperlink(T))
                  ),
                  this._parser.registerOscHandler(
                    10,
                    new $.OscHandler((T) => this.setOrReportFgColor(T))
                  ),
                  this._parser.registerOscHandler(
                    11,
                    new $.OscHandler((T) => this.setOrReportBgColor(T))
                  ),
                  this._parser.registerOscHandler(
                    12,
                    new $.OscHandler((T) => this.setOrReportCursorColor(T))
                  ),
                  this._parser.registerOscHandler(
                    104,
                    new $.OscHandler((T) => this.restoreIndexedColor(T))
                  ),
                  this._parser.registerOscHandler(
                    110,
                    new $.OscHandler((T) => this.restoreFgColor(T))
                  ),
                  this._parser.registerOscHandler(
                    111,
                    new $.OscHandler((T) => this.restoreBgColor(T))
                  ),
                  this._parser.registerOscHandler(
                    112,
                    new $.OscHandler((T) => this.restoreCursorColor(T))
                  ),
                  this._parser.registerEscHandler({ final: "7" }, () =>
                    this.saveCursor()
                  ),
                  this._parser.registerEscHandler({ final: "8" }, () =>
                    this.restoreCursor()
                  ),
                  this._parser.registerEscHandler({ final: "D" }, () =>
                    this.index()
                  ),
                  this._parser.registerEscHandler({ final: "E" }, () =>
                    this.nextLine()
                  ),
                  this._parser.registerEscHandler({ final: "H" }, () =>
                    this.tabSet()
                  ),
                  this._parser.registerEscHandler({ final: "M" }, () =>
                    this.reverseIndex()
                  ),
                  this._parser.registerEscHandler({ final: "=" }, () =>
                    this.keypadApplicationMode()
                  ),
                  this._parser.registerEscHandler({ final: ">" }, () =>
                    this.keypadNumericMode()
                  ),
                  this._parser.registerEscHandler({ final: "c" }, () =>
                    this.fullReset()
                  ),
                  this._parser.registerEscHandler({ final: "n" }, () =>
                    this.setgLevel(2)
                  ),
                  this._parser.registerEscHandler({ final: "o" }, () =>
                    this.setgLevel(3)
                  ),
                  this._parser.registerEscHandler({ final: "|" }, () =>
                    this.setgLevel(3)
                  ),
                  this._parser.registerEscHandler({ final: "}" }, () =>
                    this.setgLevel(2)
                  ),
                  this._parser.registerEscHandler({ final: "~" }, () =>
                    this.setgLevel(1)
                  ),
                  this._parser.registerEscHandler(
                    { intermediates: "%", final: "@" },
                    () => this.selectDefaultCharset()
                  ),
                  this._parser.registerEscHandler(
                    { intermediates: "%", final: "G" },
                    () => this.selectDefaultCharset()
                  );
                for (let T in J.CHARSETS)
                  this._parser.registerEscHandler(
                    { intermediates: "(", final: T },
                    () => this.selectCharset("(" + T)
                  ),
                    this._parser.registerEscHandler(
                      { intermediates: ")", final: T },
                      () => this.selectCharset(")" + T)
                    ),
                    this._parser.registerEscHandler(
                      { intermediates: "*", final: T },
                      () => this.selectCharset("*" + T)
                    ),
                    this._parser.registerEscHandler(
                      { intermediates: "+", final: T },
                      () => this.selectCharset("+" + T)
                    ),
                    this._parser.registerEscHandler(
                      { intermediates: "-", final: T },
                      () => this.selectCharset("-" + T)
                    ),
                    this._parser.registerEscHandler(
                      { intermediates: ".", final: T },
                      () => this.selectCharset("." + T)
                    ),
                    this._parser.registerEscHandler(
                      { intermediates: "/", final: T },
                      () => this.selectCharset("/" + T)
                    );
                this._parser.registerEscHandler(
                  { intermediates: "#", final: "8" },
                  () => this.screenAlignmentPattern()
                ),
                  this._parser.setErrorHandler(
                    (T) => (this._logService.error("Parsing error: ", T), T)
                  ),
                  this._parser.registerDcsHandler(
                    { intermediates: "$", final: "q" },
                    new E.DcsHandler((T, x) => this.requestStatusString(T, x))
                  );
              }
              _preserveStack(R, D, y, A) {
                (this._parseStack.paused = !0),
                  (this._parseStack.cursorStartX = R),
                  (this._parseStack.cursorStartY = D),
                  (this._parseStack.decodedLength = y),
                  (this._parseStack.position = A);
              }
              _logSlowResolvingAsync(R) {
                this._logService.logLevel <= j.LogLevelEnum.WARN &&
                  Promise.race([
                    R,
                    new Promise((D, y) =>
                      setTimeout(() => y("#SLOW_TIMEOUT"), 5000)
                    ),
                  ]).catch((D) => {
                    if (D !== "#SLOW_TIMEOUT") throw D;
                    console.warn(
                      "async parser handler taking longer than 5000 ms"
                    );
                  });
              }
              _getCurrentLinkId() {
                return this._curAttrData.extended.urlId;
              }
              parse(R, D) {
                let y,
                  A = this._activeBuffer.x,
                  v = this._activeBuffer.y,
                  m = 0,
                  p = this._parseStack.paused;
                if (p) {
                  if (
                    (y = this._parser.parse(
                      this._parseBuffer,
                      this._parseStack.decodedLength,
                      D
                    ))
                  )
                    return this._logSlowResolvingAsync(y), y;
                  (A = this._parseStack.cursorStartX),
                    (v = this._parseStack.cursorStartY),
                    (this._parseStack.paused = !1),
                    R.length > k && (m = this._parseStack.position + k);
                }
                if (
                  (this._logService.logLevel <= j.LogLevelEnum.DEBUG &&
                    this._logService.debug(
                      "parsing data" +
                        (typeof R == "string"
                          ? ` "${R}"`
                          : ` "${Array.prototype.map.call(R, (f) => String.fromCharCode(f)).join("")}"`),
                      typeof R == "string"
                        ? R.split("").map((f) => f.charCodeAt(0))
                        : R
                    ),
                  this._parseBuffer.length < R.length &&
                    this._parseBuffer.length < k &&
                    (this._parseBuffer = new Uint32Array(
                      Math.min(R.length, k)
                    )),
                  p || this._dirtyRowTracker.clearRange(),
                  R.length > k)
                )
                  for (let f = m; f < R.length; f += k) {
                    let d = f + k < R.length ? f + k : R.length,
                      T =
                        typeof R == "string"
                          ? this._stringDecoder.decode(
                              R.substring(f, d),
                              this._parseBuffer
                            )
                          : this._utf8Decoder.decode(
                              R.subarray(f, d),
                              this._parseBuffer
                            );
                    if ((y = this._parser.parse(this._parseBuffer, T)))
                      return (
                        this._preserveStack(A, v, T, f),
                        this._logSlowResolvingAsync(y),
                        y
                      );
                  }
                else if (!p) {
                  let f =
                    typeof R == "string"
                      ? this._stringDecoder.decode(R, this._parseBuffer)
                      : this._utf8Decoder.decode(R, this._parseBuffer);
                  if ((y = this._parser.parse(this._parseBuffer, f)))
                    return (
                      this._preserveStack(A, v, f, 0),
                      this._logSlowResolvingAsync(y),
                      y
                    );
                }
                (this._activeBuffer.x === A && this._activeBuffer.y === v) ||
                  this._onCursorMove.fire(),
                  this._onRequestRefreshRows.fire(
                    this._dirtyRowTracker.start,
                    this._dirtyRowTracker.end
                  );
              }
              print(R, D, y) {
                let A,
                  v,
                  m = this._charsetService.charset,
                  p = this._optionsService.rawOptions.screenReaderMode,
                  f = this._bufferService.cols,
                  d = this._coreService.decPrivateModes.wraparound,
                  T = this._coreService.modes.insertMode,
                  x = this._curAttrData,
                  C = this._activeBuffer.lines.get(
                    this._activeBuffer.ybase + this._activeBuffer.y
                  );
                this._dirtyRowTracker.markDirty(this._activeBuffer.y),
                  this._activeBuffer.x &&
                    y - D > 0 &&
                    C.getWidth(this._activeBuffer.x - 1) === 2 &&
                    C.setCellFromCodePoint(
                      this._activeBuffer.x - 1,
                      0,
                      1,
                      x.fg,
                      x.bg,
                      x.extended
                    );
                for (let g = D; g < y; ++g) {
                  if (
                    ((A = R[g]),
                    (v = this._unicodeService.wcwidth(A)),
                    A < 127 && m)
                  ) {
                    let a = m[String.fromCharCode(A)];
                    a && (A = a.charCodeAt(0));
                  }
                  if (
                    (p && this._onA11yChar.fire((0, G.stringFromCodePoint)(A)),
                    this._getCurrentLinkId() &&
                      this._oscLinkService.addLineToLink(
                        this._getCurrentLinkId(),
                        this._activeBuffer.ybase + this._activeBuffer.y
                      ),
                    v || !this._activeBuffer.x)
                  ) {
                    if (this._activeBuffer.x + v - 1 >= f) {
                      if (d) {
                        for (; this._activeBuffer.x < f; )
                          C.setCellFromCodePoint(
                            this._activeBuffer.x++,
                            0,
                            1,
                            x.fg,
                            x.bg,
                            x.extended
                          );
                        (this._activeBuffer.x = 0),
                          this._activeBuffer.y++,
                          this._activeBuffer.y ===
                          this._activeBuffer.scrollBottom + 1
                            ? (this._activeBuffer.y--,
                              this._bufferService.scroll(
                                this._eraseAttrData(),
                                !0
                              ))
                            : (this._activeBuffer.y >=
                                this._bufferService.rows &&
                                (this._activeBuffer.y =
                                  this._bufferService.rows - 1),
                              (this._activeBuffer.lines.get(
                                this._activeBuffer.ybase + this._activeBuffer.y
                              ).isWrapped = !0)),
                          (C = this._activeBuffer.lines.get(
                            this._activeBuffer.ybase + this._activeBuffer.y
                          ));
                      } else if (((this._activeBuffer.x = f - 1), v === 2))
                        continue;
                    }
                    if (
                      (T &&
                        (C.insertCells(
                          this._activeBuffer.x,
                          v,
                          this._activeBuffer.getNullCell(x),
                          x
                        ),
                        C.getWidth(f - 1) === 2 &&
                          C.setCellFromCodePoint(
                            f - 1,
                            Z.NULL_CELL_CODE,
                            Z.NULL_CELL_WIDTH,
                            x.fg,
                            x.bg,
                            x.extended
                          )),
                      C.setCellFromCodePoint(
                        this._activeBuffer.x++,
                        A,
                        v,
                        x.fg,
                        x.bg,
                        x.extended
                      ),
                      v > 0)
                    )
                      for (; --v; )
                        C.setCellFromCodePoint(
                          this._activeBuffer.x++,
                          0,
                          0,
                          x.fg,
                          x.bg,
                          x.extended
                        );
                  } else
                    C.getWidth(this._activeBuffer.x - 1)
                      ? C.addCodepointToCell(this._activeBuffer.x - 1, A)
                      : C.addCodepointToCell(this._activeBuffer.x - 2, A);
                }
                y - D > 0 &&
                  (C.loadCell(this._activeBuffer.x - 1, this._workCell),
                  this._workCell.getWidth() === 2 ||
                  this._workCell.getCode() > 65535
                    ? (this._parser.precedingCodepoint = 0)
                    : this._workCell.isCombined()
                      ? (this._parser.precedingCodepoint = this._workCell
                          .getChars()
                          .charCodeAt(0))
                      : (this._parser.precedingCodepoint =
                          this._workCell.content)),
                  this._activeBuffer.x < f &&
                    y - D > 0 &&
                    C.getWidth(this._activeBuffer.x) === 0 &&
                    !C.hasContent(this._activeBuffer.x) &&
                    C.setCellFromCodePoint(
                      this._activeBuffer.x,
                      0,
                      1,
                      x.fg,
                      x.bg,
                      x.extended
                    ),
                  this._dirtyRowTracker.markDirty(this._activeBuffer.y);
              }
              registerCsiHandler(R, D) {
                return R.final !== "t" || R.prefix || R.intermediates
                  ? this._parser.registerCsiHandler(R, D)
                  : this._parser.registerCsiHandler(
                      R,
                      (y) =>
                        !O(
                          y.params[0],
                          this._optionsService.rawOptions.windowOptions
                        ) || D(y)
                    );
              }
              registerDcsHandler(R, D) {
                return this._parser.registerDcsHandler(R, new E.DcsHandler(D));
              }
              registerEscHandler(R, D) {
                return this._parser.registerEscHandler(R, D);
              }
              registerOscHandler(R, D) {
                return this._parser.registerOscHandler(R, new $.OscHandler(D));
              }
              bell() {
                return this._onRequestBell.fire(), !0;
              }
              lineFeed() {
                return (
                  this._dirtyRowTracker.markDirty(this._activeBuffer.y),
                  this._optionsService.rawOptions.convertEol &&
                    (this._activeBuffer.x = 0),
                  this._activeBuffer.y++,
                  this._activeBuffer.y === this._activeBuffer.scrollBottom + 1
                    ? (this._activeBuffer.y--,
                      this._bufferService.scroll(this._eraseAttrData()))
                    : this._activeBuffer.y >= this._bufferService.rows
                      ? (this._activeBuffer.y = this._bufferService.rows - 1)
                      : (this._activeBuffer.lines.get(
                          this._activeBuffer.ybase + this._activeBuffer.y
                        ).isWrapped = !1),
                  this._activeBuffer.x >= this._bufferService.cols &&
                    this._activeBuffer.x--,
                  this._dirtyRowTracker.markDirty(this._activeBuffer.y),
                  this._onLineFeed.fire(),
                  !0
                );
              }
              carriageReturn() {
                return (this._activeBuffer.x = 0), !0;
              }
              backspace() {
                var R;
                if (!this._coreService.decPrivateModes.reverseWraparound)
                  return (
                    this._restrictCursor(),
                    this._activeBuffer.x > 0 && this._activeBuffer.x--,
                    !0
                  );
                if (
                  (this._restrictCursor(this._bufferService.cols),
                  this._activeBuffer.x > 0)
                )
                  this._activeBuffer.x--;
                else if (
                  this._activeBuffer.x === 0 &&
                  this._activeBuffer.y > this._activeBuffer.scrollTop &&
                  this._activeBuffer.y <= this._activeBuffer.scrollBottom &&
                  ((R = this._activeBuffer.lines.get(
                    this._activeBuffer.ybase + this._activeBuffer.y
                  )) === null || R === void 0
                    ? void 0
                    : R.isWrapped)
                ) {
                  (this._activeBuffer.lines.get(
                    this._activeBuffer.ybase + this._activeBuffer.y
                  ).isWrapped = !1),
                    this._activeBuffer.y--,
                    (this._activeBuffer.x = this._bufferService.cols - 1);
                  let D = this._activeBuffer.lines.get(
                    this._activeBuffer.ybase + this._activeBuffer.y
                  );
                  D.hasWidth(this._activeBuffer.x) &&
                    !D.hasContent(this._activeBuffer.x) &&
                    this._activeBuffer.x--;
                }
                return this._restrictCursor(), !0;
              }
              tab() {
                if (this._activeBuffer.x >= this._bufferService.cols) return !0;
                let R = this._activeBuffer.x;
                return (
                  (this._activeBuffer.x = this._activeBuffer.nextStop()),
                  this._optionsService.rawOptions.screenReaderMode &&
                    this._onA11yTab.fire(this._activeBuffer.x - R),
                  !0
                );
              }
              shiftOut() {
                return this._charsetService.setgLevel(1), !0;
              }
              shiftIn() {
                return this._charsetService.setgLevel(0), !0;
              }
              _restrictCursor(R = this._bufferService.cols - 1) {
                (this._activeBuffer.x = Math.min(
                  R,
                  Math.max(0, this._activeBuffer.x)
                )),
                  (this._activeBuffer.y = this._coreService.decPrivateModes
                    .origin
                    ? Math.min(
                        this._activeBuffer.scrollBottom,
                        Math.max(
                          this._activeBuffer.scrollTop,
                          this._activeBuffer.y
                        )
                      )
                    : Math.min(
                        this._bufferService.rows - 1,
                        Math.max(0, this._activeBuffer.y)
                      )),
                  this._dirtyRowTracker.markDirty(this._activeBuffer.y);
              }
              _setCursor(R, D) {
                this._dirtyRowTracker.markDirty(this._activeBuffer.y),
                  this._coreService.decPrivateModes.origin
                    ? ((this._activeBuffer.x = R),
                      (this._activeBuffer.y = this._activeBuffer.scrollTop + D))
                    : ((this._activeBuffer.x = R), (this._activeBuffer.y = D)),
                  this._restrictCursor(),
                  this._dirtyRowTracker.markDirty(this._activeBuffer.y);
              }
              _moveCursor(R, D) {
                this._restrictCursor(),
                  this._setCursor(
                    this._activeBuffer.x + R,
                    this._activeBuffer.y + D
                  );
              }
              cursorUp(R) {
                let D = this._activeBuffer.y - this._activeBuffer.scrollTop;
                return (
                  D >= 0
                    ? this._moveCursor(0, -Math.min(D, R.params[0] || 1))
                    : this._moveCursor(0, -(R.params[0] || 1)),
                  !0
                );
              }
              cursorDown(R) {
                let D = this._activeBuffer.scrollBottom - this._activeBuffer.y;
                return (
                  D >= 0
                    ? this._moveCursor(0, Math.min(D, R.params[0] || 1))
                    : this._moveCursor(0, R.params[0] || 1),
                  !0
                );
              }
              cursorForward(R) {
                return this._moveCursor(R.params[0] || 1, 0), !0;
              }
              cursorBackward(R) {
                return this._moveCursor(-(R.params[0] || 1), 0), !0;
              }
              cursorNextLine(R) {
                return this.cursorDown(R), (this._activeBuffer.x = 0), !0;
              }
              cursorPrecedingLine(R) {
                return this.cursorUp(R), (this._activeBuffer.x = 0), !0;
              }
              cursorCharAbsolute(R) {
                return (
                  this._setCursor((R.params[0] || 1) - 1, this._activeBuffer.y),
                  !0
                );
              }
              cursorPosition(R) {
                return (
                  this._setCursor(
                    R.length >= 2 ? (R.params[1] || 1) - 1 : 0,
                    (R.params[0] || 1) - 1
                  ),
                  !0
                );
              }
              charPosAbsolute(R) {
                return (
                  this._setCursor((R.params[0] || 1) - 1, this._activeBuffer.y),
                  !0
                );
              }
              hPositionRelative(R) {
                return this._moveCursor(R.params[0] || 1, 0), !0;
              }
              linePosAbsolute(R) {
                return (
                  this._setCursor(this._activeBuffer.x, (R.params[0] || 1) - 1),
                  !0
                );
              }
              vPositionRelative(R) {
                return this._moveCursor(0, R.params[0] || 1), !0;
              }
              hVPosition(R) {
                return this.cursorPosition(R), !0;
              }
              tabClear(R) {
                let D = R.params[0];
                return (
                  D === 0
                    ? delete this._activeBuffer.tabs[this._activeBuffer.x]
                    : D === 3 && (this._activeBuffer.tabs = {}),
                  !0
                );
              }
              cursorForwardTab(R) {
                if (this._activeBuffer.x >= this._bufferService.cols) return !0;
                let D = R.params[0] || 1;
                for (; D--; )
                  this._activeBuffer.x = this._activeBuffer.nextStop();
                return !0;
              }
              cursorBackwardTab(R) {
                if (this._activeBuffer.x >= this._bufferService.cols) return !0;
                let D = R.params[0] || 1;
                for (; D--; )
                  this._activeBuffer.x = this._activeBuffer.prevStop();
                return !0;
              }
              selectProtected(R) {
                let D = R.params[0];
                return (
                  D === 1 && (this._curAttrData.bg |= 536870912),
                  (D !== 2 && D !== 0) || (this._curAttrData.bg &= -536870913),
                  !0
                );
              }
              _eraseInBufferLine(R, D, y, A = !1, v = !1) {
                let m = this._activeBuffer.lines.get(
                  this._activeBuffer.ybase + R
                );
                m.replaceCells(
                  D,
                  y,
                  this._activeBuffer.getNullCell(this._eraseAttrData()),
                  this._eraseAttrData(),
                  v
                ),
                  A && (m.isWrapped = !1);
              }
              _resetBufferLine(R, D = !1) {
                let y = this._activeBuffer.lines.get(
                  this._activeBuffer.ybase + R
                );
                y &&
                  (y.fill(
                    this._activeBuffer.getNullCell(this._eraseAttrData()),
                    D
                  ),
                  this._bufferService.buffer.clearMarkers(
                    this._activeBuffer.ybase + R
                  ),
                  (y.isWrapped = !1));
              }
              eraseInDisplay(R, D = !1) {
                let y;
                switch (
                  (this._restrictCursor(this._bufferService.cols), R.params[0])
                ) {
                  case 0:
                    for (
                      y = this._activeBuffer.y,
                        this._dirtyRowTracker.markDirty(y),
                        this._eraseInBufferLine(
                          y++,
                          this._activeBuffer.x,
                          this._bufferService.cols,
                          this._activeBuffer.x === 0,
                          D
                        );
                      y < this._bufferService.rows;
                      y++
                    )
                      this._resetBufferLine(y, D);
                    this._dirtyRowTracker.markDirty(y);
                    break;
                  case 1:
                    for (
                      y = this._activeBuffer.y,
                        this._dirtyRowTracker.markDirty(y),
                        this._eraseInBufferLine(
                          y,
                          0,
                          this._activeBuffer.x + 1,
                          !0,
                          D
                        ),
                        this._activeBuffer.x + 1 >= this._bufferService.cols &&
                          (this._activeBuffer.lines.get(y + 1).isWrapped = !1);
                      y--;
                    )
                      this._resetBufferLine(y, D);
                    this._dirtyRowTracker.markDirty(0);
                    break;
                  case 2:
                    for (
                      y = this._bufferService.rows,
                        this._dirtyRowTracker.markDirty(y - 1);
                      y--;
                    )
                      this._resetBufferLine(y, D);
                    this._dirtyRowTracker.markDirty(0);
                    break;
                  case 3:
                    let A =
                      this._activeBuffer.lines.length -
                      this._bufferService.rows;
                    A > 0 &&
                      (this._activeBuffer.lines.trimStart(A),
                      (this._activeBuffer.ybase = Math.max(
                        this._activeBuffer.ybase - A,
                        0
                      )),
                      (this._activeBuffer.ydisp = Math.max(
                        this._activeBuffer.ydisp - A,
                        0
                      )),
                      this._onScroll.fire(0));
                }
                return !0;
              }
              eraseInLine(R, D = !1) {
                switch (
                  (this._restrictCursor(this._bufferService.cols), R.params[0])
                ) {
                  case 0:
                    this._eraseInBufferLine(
                      this._activeBuffer.y,
                      this._activeBuffer.x,
                      this._bufferService.cols,
                      this._activeBuffer.x === 0,
                      D
                    );
                    break;
                  case 1:
                    this._eraseInBufferLine(
                      this._activeBuffer.y,
                      0,
                      this._activeBuffer.x + 1,
                      !1,
                      D
                    );
                    break;
                  case 2:
                    this._eraseInBufferLine(
                      this._activeBuffer.y,
                      0,
                      this._bufferService.cols,
                      !0,
                      D
                    );
                }
                return (
                  this._dirtyRowTracker.markDirty(this._activeBuffer.y), !0
                );
              }
              insertLines(R) {
                this._restrictCursor();
                let D = R.params[0] || 1;
                if (
                  this._activeBuffer.y > this._activeBuffer.scrollBottom ||
                  this._activeBuffer.y < this._activeBuffer.scrollTop
                )
                  return !0;
                let y = this._activeBuffer.ybase + this._activeBuffer.y,
                  A =
                    this._bufferService.rows -
                    1 -
                    this._activeBuffer.scrollBottom,
                  v =
                    this._bufferService.rows -
                    1 +
                    this._activeBuffer.ybase -
                    A +
                    1;
                for (; D--; )
                  this._activeBuffer.lines.splice(v - 1, 1),
                    this._activeBuffer.lines.splice(
                      y,
                      0,
                      this._activeBuffer.getBlankLine(this._eraseAttrData())
                    );
                return (
                  this._dirtyRowTracker.markRangeDirty(
                    this._activeBuffer.y,
                    this._activeBuffer.scrollBottom
                  ),
                  (this._activeBuffer.x = 0),
                  !0
                );
              }
              deleteLines(R) {
                this._restrictCursor();
                let D = R.params[0] || 1;
                if (
                  this._activeBuffer.y > this._activeBuffer.scrollBottom ||
                  this._activeBuffer.y < this._activeBuffer.scrollTop
                )
                  return !0;
                let y = this._activeBuffer.ybase + this._activeBuffer.y,
                  A;
                for (
                  A =
                    this._bufferService.rows -
                    1 -
                    this._activeBuffer.scrollBottom,
                    A =
                      this._bufferService.rows -
                      1 +
                      this._activeBuffer.ybase -
                      A;
                  D--;
                )
                  this._activeBuffer.lines.splice(y, 1),
                    this._activeBuffer.lines.splice(
                      A,
                      0,
                      this._activeBuffer.getBlankLine(this._eraseAttrData())
                    );
                return (
                  this._dirtyRowTracker.markRangeDirty(
                    this._activeBuffer.y,
                    this._activeBuffer.scrollBottom
                  ),
                  (this._activeBuffer.x = 0),
                  !0
                );
              }
              insertChars(R) {
                this._restrictCursor();
                let D = this._activeBuffer.lines.get(
                  this._activeBuffer.ybase + this._activeBuffer.y
                );
                return (
                  D &&
                    (D.insertCells(
                      this._activeBuffer.x,
                      R.params[0] || 1,
                      this._activeBuffer.getNullCell(this._eraseAttrData()),
                      this._eraseAttrData()
                    ),
                    this._dirtyRowTracker.markDirty(this._activeBuffer.y)),
                  !0
                );
              }
              deleteChars(R) {
                this._restrictCursor();
                let D = this._activeBuffer.lines.get(
                  this._activeBuffer.ybase + this._activeBuffer.y
                );
                return (
                  D &&
                    (D.deleteCells(
                      this._activeBuffer.x,
                      R.params[0] || 1,
                      this._activeBuffer.getNullCell(this._eraseAttrData()),
                      this._eraseAttrData()
                    ),
                    this._dirtyRowTracker.markDirty(this._activeBuffer.y)),
                  !0
                );
              }
              scrollUp(R) {
                let D = R.params[0] || 1;
                for (; D--; )
                  this._activeBuffer.lines.splice(
                    this._activeBuffer.ybase + this._activeBuffer.scrollTop,
                    1
                  ),
                    this._activeBuffer.lines.splice(
                      this._activeBuffer.ybase +
                        this._activeBuffer.scrollBottom,
                      0,
                      this._activeBuffer.getBlankLine(this._eraseAttrData())
                    );
                return (
                  this._dirtyRowTracker.markRangeDirty(
                    this._activeBuffer.scrollTop,
                    this._activeBuffer.scrollBottom
                  ),
                  !0
                );
              }
              scrollDown(R) {
                let D = R.params[0] || 1;
                for (; D--; )
                  this._activeBuffer.lines.splice(
                    this._activeBuffer.ybase + this._activeBuffer.scrollBottom,
                    1
                  ),
                    this._activeBuffer.lines.splice(
                      this._activeBuffer.ybase + this._activeBuffer.scrollTop,
                      0,
                      this._activeBuffer.getBlankLine(Q.DEFAULT_ATTR_DATA)
                    );
                return (
                  this._dirtyRowTracker.markRangeDirty(
                    this._activeBuffer.scrollTop,
                    this._activeBuffer.scrollBottom
                  ),
                  !0
                );
              }
              scrollLeft(R) {
                if (
                  this._activeBuffer.y > this._activeBuffer.scrollBottom ||
                  this._activeBuffer.y < this._activeBuffer.scrollTop
                )
                  return !0;
                let D = R.params[0] || 1;
                for (
                  let y = this._activeBuffer.scrollTop;
                  y <= this._activeBuffer.scrollBottom;
                  ++y
                ) {
                  let A = this._activeBuffer.lines.get(
                    this._activeBuffer.ybase + y
                  );
                  A.deleteCells(
                    0,
                    D,
                    this._activeBuffer.getNullCell(this._eraseAttrData()),
                    this._eraseAttrData()
                  ),
                    (A.isWrapped = !1);
                }
                return (
                  this._dirtyRowTracker.markRangeDirty(
                    this._activeBuffer.scrollTop,
                    this._activeBuffer.scrollBottom
                  ),
                  !0
                );
              }
              scrollRight(R) {
                if (
                  this._activeBuffer.y > this._activeBuffer.scrollBottom ||
                  this._activeBuffer.y < this._activeBuffer.scrollTop
                )
                  return !0;
                let D = R.params[0] || 1;
                for (
                  let y = this._activeBuffer.scrollTop;
                  y <= this._activeBuffer.scrollBottom;
                  ++y
                ) {
                  let A = this._activeBuffer.lines.get(
                    this._activeBuffer.ybase + y
                  );
                  A.insertCells(
                    0,
                    D,
                    this._activeBuffer.getNullCell(this._eraseAttrData()),
                    this._eraseAttrData()
                  ),
                    (A.isWrapped = !1);
                }
                return (
                  this._dirtyRowTracker.markRangeDirty(
                    this._activeBuffer.scrollTop,
                    this._activeBuffer.scrollBottom
                  ),
                  !0
                );
              }
              insertColumns(R) {
                if (
                  this._activeBuffer.y > this._activeBuffer.scrollBottom ||
                  this._activeBuffer.y < this._activeBuffer.scrollTop
                )
                  return !0;
                let D = R.params[0] || 1;
                for (
                  let y = this._activeBuffer.scrollTop;
                  y <= this._activeBuffer.scrollBottom;
                  ++y
                ) {
                  let A = this._activeBuffer.lines.get(
                    this._activeBuffer.ybase + y
                  );
                  A.insertCells(
                    this._activeBuffer.x,
                    D,
                    this._activeBuffer.getNullCell(this._eraseAttrData()),
                    this._eraseAttrData()
                  ),
                    (A.isWrapped = !1);
                }
                return (
                  this._dirtyRowTracker.markRangeDirty(
                    this._activeBuffer.scrollTop,
                    this._activeBuffer.scrollBottom
                  ),
                  !0
                );
              }
              deleteColumns(R) {
                if (
                  this._activeBuffer.y > this._activeBuffer.scrollBottom ||
                  this._activeBuffer.y < this._activeBuffer.scrollTop
                )
                  return !0;
                let D = R.params[0] || 1;
                for (
                  let y = this._activeBuffer.scrollTop;
                  y <= this._activeBuffer.scrollBottom;
                  ++y
                ) {
                  let A = this._activeBuffer.lines.get(
                    this._activeBuffer.ybase + y
                  );
                  A.deleteCells(
                    this._activeBuffer.x,
                    D,
                    this._activeBuffer.getNullCell(this._eraseAttrData()),
                    this._eraseAttrData()
                  ),
                    (A.isWrapped = !1);
                }
                return (
                  this._dirtyRowTracker.markRangeDirty(
                    this._activeBuffer.scrollTop,
                    this._activeBuffer.scrollBottom
                  ),
                  !0
                );
              }
              eraseChars(R) {
                this._restrictCursor();
                let D = this._activeBuffer.lines.get(
                  this._activeBuffer.ybase + this._activeBuffer.y
                );
                return (
                  D &&
                    (D.replaceCells(
                      this._activeBuffer.x,
                      this._activeBuffer.x + (R.params[0] || 1),
                      this._activeBuffer.getNullCell(this._eraseAttrData()),
                      this._eraseAttrData()
                    ),
                    this._dirtyRowTracker.markDirty(this._activeBuffer.y)),
                  !0
                );
              }
              repeatPrecedingCharacter(R) {
                if (!this._parser.precedingCodepoint) return !0;
                let D = R.params[0] || 1,
                  y = new Uint32Array(D);
                for (let A = 0; A < D; ++A)
                  y[A] = this._parser.precedingCodepoint;
                return this.print(y, 0, y.length), !0;
              }
              sendDeviceAttributesPrimary(R) {
                return (
                  R.params[0] > 0 ||
                    (this._is("xterm") ||
                    this._is("rxvt-unicode") ||
                    this._is("screen")
                      ? this._coreService.triggerDataEvent(q.C0.ESC + "[?1;2c")
                      : this._is("linux") &&
                        this._coreService.triggerDataEvent(q.C0.ESC + "[?6c")),
                  !0
                );
              }
              sendDeviceAttributesSecondary(R) {
                return (
                  R.params[0] > 0 ||
                    (this._is("xterm")
                      ? this._coreService.triggerDataEvent(
                          q.C0.ESC + "[>0;276;0c"
                        )
                      : this._is("rxvt-unicode")
                        ? this._coreService.triggerDataEvent(
                            q.C0.ESC + "[>85;95;0c"
                          )
                        : this._is("linux")
                          ? this._coreService.triggerDataEvent(
                              R.params[0] + "c"
                            )
                          : this._is("screen") &&
                            this._coreService.triggerDataEvent(
                              q.C0.ESC + "[>83;40003;0c"
                            )),
                  !0
                );
              }
              _is(R) {
                return (
                  (this._optionsService.rawOptions.termName + "").indexOf(R) ===
                  0
                );
              }
              setMode(R) {
                for (let D = 0; D < R.length; D++)
                  switch (R.params[D]) {
                    case 4:
                      this._coreService.modes.insertMode = !0;
                      break;
                    case 20:
                      this._optionsService.options.convertEol = !0;
                  }
                return !0;
              }
              setModePrivate(R) {
                for (let D = 0; D < R.length; D++)
                  switch (R.params[D]) {
                    case 1:
                      this._coreService.decPrivateModes.applicationCursorKeys =
                        !0;
                      break;
                    case 2:
                      this._charsetService.setgCharset(0, J.DEFAULT_CHARSET),
                        this._charsetService.setgCharset(1, J.DEFAULT_CHARSET),
                        this._charsetService.setgCharset(2, J.DEFAULT_CHARSET),
                        this._charsetService.setgCharset(3, J.DEFAULT_CHARSET);
                      break;
                    case 3:
                      this._optionsService.rawOptions.windowOptions
                        .setWinLines &&
                        (this._bufferService.resize(
                          132,
                          this._bufferService.rows
                        ),
                        this._onRequestReset.fire());
                      break;
                    case 6:
                      (this._coreService.decPrivateModes.origin = !0),
                        this._setCursor(0, 0);
                      break;
                    case 7:
                      this._coreService.decPrivateModes.wraparound = !0;
                      break;
                    case 12:
                      this._optionsService.options.cursorBlink = !0;
                      break;
                    case 45:
                      this._coreService.decPrivateModes.reverseWraparound = !0;
                      break;
                    case 66:
                      this._logService.debug(
                        "Serial port requested application keypad."
                      ),
                        (this._coreService.decPrivateModes.applicationKeypad =
                          !0),
                        this._onRequestSyncScrollBar.fire();
                      break;
                    case 9:
                      this._coreMouseService.activeProtocol = "X10";
                      break;
                    case 1000:
                      this._coreMouseService.activeProtocol = "VT200";
                      break;
                    case 1002:
                      this._coreMouseService.activeProtocol = "DRAG";
                      break;
                    case 1003:
                      this._coreMouseService.activeProtocol = "ANY";
                      break;
                    case 1004:
                      (this._coreService.decPrivateModes.sendFocus = !0),
                        this._onRequestSendFocus.fire();
                      break;
                    case 1005:
                      this._logService.debug(
                        "DECSET 1005 not supported (see #2507)"
                      );
                      break;
                    case 1006:
                      this._coreMouseService.activeEncoding = "SGR";
                      break;
                    case 1015:
                      this._logService.debug(
                        "DECSET 1015 not supported (see #2507)"
                      );
                      break;
                    case 1016:
                      this._coreMouseService.activeEncoding = "SGR_PIXELS";
                      break;
                    case 25:
                      this._coreService.isCursorHidden = !1;
                      break;
                    case 1048:
                      this.saveCursor();
                      break;
                    case 1049:
                      this.saveCursor();
                    case 47:
                    case 1047:
                      this._bufferService.buffers.activateAltBuffer(
                        this._eraseAttrData()
                      ),
                        (this._coreService.isCursorInitialized = !0),
                        this._onRequestRefreshRows.fire(
                          0,
                          this._bufferService.rows - 1
                        ),
                        this._onRequestSyncScrollBar.fire();
                      break;
                    case 2004:
                      this._coreService.decPrivateModes.bracketedPasteMode = !0;
                  }
                return !0;
              }
              resetMode(R) {
                for (let D = 0; D < R.length; D++)
                  switch (R.params[D]) {
                    case 4:
                      this._coreService.modes.insertMode = !1;
                      break;
                    case 20:
                      this._optionsService.options.convertEol = !1;
                  }
                return !0;
              }
              resetModePrivate(R) {
                for (let D = 0; D < R.length; D++)
                  switch (R.params[D]) {
                    case 1:
                      this._coreService.decPrivateModes.applicationCursorKeys =
                        !1;
                      break;
                    case 3:
                      this._optionsService.rawOptions.windowOptions
                        .setWinLines &&
                        (this._bufferService.resize(
                          80,
                          this._bufferService.rows
                        ),
                        this._onRequestReset.fire());
                      break;
                    case 6:
                      (this._coreService.decPrivateModes.origin = !1),
                        this._setCursor(0, 0);
                      break;
                    case 7:
                      this._coreService.decPrivateModes.wraparound = !1;
                      break;
                    case 12:
                      this._optionsService.options.cursorBlink = !1;
                      break;
                    case 45:
                      this._coreService.decPrivateModes.reverseWraparound = !1;
                      break;
                    case 66:
                      this._logService.debug(
                        "Switching back to normal keypad."
                      ),
                        (this._coreService.decPrivateModes.applicationKeypad =
                          !1),
                        this._onRequestSyncScrollBar.fire();
                      break;
                    case 9:
                    case 1000:
                    case 1002:
                    case 1003:
                      this._coreMouseService.activeProtocol = "NONE";
                      break;
                    case 1004:
                      this._coreService.decPrivateModes.sendFocus = !1;
                      break;
                    case 1005:
                      this._logService.debug(
                        "DECRST 1005 not supported (see #2507)"
                      );
                      break;
                    case 1006:
                    case 1016:
                      this._coreMouseService.activeEncoding = "DEFAULT";
                      break;
                    case 1015:
                      this._logService.debug(
                        "DECRST 1015 not supported (see #2507)"
                      );
                      break;
                    case 25:
                      this._coreService.isCursorHidden = !0;
                      break;
                    case 1048:
                      this.restoreCursor();
                      break;
                    case 1049:
                    case 47:
                    case 1047:
                      this._bufferService.buffers.activateNormalBuffer(),
                        R.params[D] === 1049 && this.restoreCursor(),
                        (this._coreService.isCursorInitialized = !0),
                        this._onRequestRefreshRows.fire(
                          0,
                          this._bufferService.rows - 1
                        ),
                        this._onRequestSyncScrollBar.fire();
                      break;
                    case 2004:
                      this._coreService.decPrivateModes.bracketedPasteMode = !1;
                  }
                return !0;
              }
              requestMode(R, D) {
                let y = this._coreService.decPrivateModes,
                  { activeProtocol: A, activeEncoding: v } =
                    this._coreMouseService,
                  m = this._coreService,
                  { buffers: p, cols: f } = this._bufferService,
                  { active: d, alt: T } = p,
                  x = this._optionsService.rawOptions,
                  C = (r) => (r ? 1 : 2),
                  g = R.params[0];
                return (
                  (a = g),
                  (w = D
                    ? g === 2
                      ? 4
                      : g === 4
                        ? C(m.modes.insertMode)
                        : g === 12
                          ? 3
                          : g === 20
                            ? C(x.convertEol)
                            : 0
                    : g === 1
                      ? C(y.applicationCursorKeys)
                      : g === 3
                        ? x.windowOptions.setWinLines
                          ? f === 80
                            ? 2
                            : f === 132
                              ? 1
                              : 0
                          : 0
                        : g === 6
                          ? C(y.origin)
                          : g === 7
                            ? C(y.wraparound)
                            : g === 8
                              ? 3
                              : g === 9
                                ? C(A === "X10")
                                : g === 12
                                  ? C(x.cursorBlink)
                                  : g === 25
                                    ? C(!m.isCursorHidden)
                                    : g === 45
                                      ? C(y.reverseWraparound)
                                      : g === 66
                                        ? C(y.applicationKeypad)
                                        : g === 67
                                          ? 4
                                          : g === 1000
                                            ? C(A === "VT200")
                                            : g === 1002
                                              ? C(A === "DRAG")
                                              : g === 1003
                                                ? C(A === "ANY")
                                                : g === 1004
                                                  ? C(y.sendFocus)
                                                  : g === 1005
                                                    ? 4
                                                    : g === 1006
                                                      ? C(v === "SGR")
                                                      : g === 1015
                                                        ? 4
                                                        : g === 1016
                                                          ? C(
                                                              v === "SGR_PIXELS"
                                                            )
                                                          : g === 1048
                                                            ? 1
                                                            : g === 47 ||
                                                                g === 1047 ||
                                                                g === 1049
                                                              ? C(d === T)
                                                              : g === 2004
                                                                ? C(
                                                                    y.bracketedPasteMode
                                                                  )
                                                                : 0),
                  m.triggerDataEvent(`${q.C0.ESC}[${D ? "" : "?"}${a};${w}$y`),
                  !0
                );
                var a, w;
              }
              _updateAttrColor(R, D, y, A, v) {
                return (
                  D === 2
                    ? ((R |= 50331648),
                      (R &= -16777216),
                      (R |= F.AttributeData.fromColorRGB([y, A, v])))
                    : D === 5 &&
                      ((R &= -50331904), (R |= 33554432 | (255 & y))),
                  R
                );
              }
              _extractColor(R, D, y) {
                let A = [0, 0, -1, 0, 0, 0],
                  v = 0,
                  m = 0;
                do {
                  if (((A[m + v] = R.params[D + m]), R.hasSubParams(D + m))) {
                    let p = R.getSubParams(D + m),
                      f = 0;
                    do A[1] === 5 && (v = 1), (A[m + f + 1 + v] = p[f]);
                    while (++f < p.length && f + m + 1 + v < A.length);
                    break;
                  }
                  if ((A[1] === 5 && m + v >= 2) || (A[1] === 2 && m + v >= 5))
                    break;
                  A[1] && (v = 1);
                } while (++m + D < R.length && m + v < A.length);
                for (let p = 2; p < A.length; ++p) A[p] === -1 && (A[p] = 0);
                switch (A[0]) {
                  case 38:
                    y.fg = this._updateAttrColor(y.fg, A[1], A[3], A[4], A[5]);
                    break;
                  case 48:
                    y.bg = this._updateAttrColor(y.bg, A[1], A[3], A[4], A[5]);
                    break;
                  case 58:
                    (y.extended = y.extended.clone()),
                      (y.extended.underlineColor = this._updateAttrColor(
                        y.extended.underlineColor,
                        A[1],
                        A[3],
                        A[4],
                        A[5]
                      ));
                }
                return m;
              }
              _processUnderline(R, D) {
                (D.extended = D.extended.clone()),
                  (!~R || R > 5) && (R = 1),
                  (D.extended.underlineStyle = R),
                  (D.fg |= 268435456),
                  R === 0 && (D.fg &= -268435457),
                  D.updateExtended();
              }
              _processSGR0(R) {
                (R.fg = Q.DEFAULT_ATTR_DATA.fg),
                  (R.bg = Q.DEFAULT_ATTR_DATA.bg),
                  (R.extended = R.extended.clone()),
                  (R.extended.underlineStyle = 0),
                  (R.extended.underlineColor &= -67108864),
                  R.updateExtended();
              }
              charAttributes(R) {
                if (R.length === 1 && R.params[0] === 0)
                  return this._processSGR0(this._curAttrData), !0;
                let D = R.length,
                  y,
                  A = this._curAttrData;
                for (let v = 0; v < D; v++)
                  (y = R.params[v]),
                    y >= 30 && y <= 37
                      ? ((A.fg &= -50331904), (A.fg |= 16777216 | (y - 30)))
                      : y >= 40 && y <= 47
                        ? ((A.bg &= -50331904), (A.bg |= 16777216 | (y - 40)))
                        : y >= 90 && y <= 97
                          ? ((A.fg &= -50331904), (A.fg |= 16777224 | (y - 90)))
                          : y >= 100 && y <= 107
                            ? ((A.bg &= -50331904),
                              (A.bg |= 16777224 | (y - 100)))
                            : y === 0
                              ? this._processSGR0(A)
                              : y === 1
                                ? (A.fg |= 134217728)
                                : y === 3
                                  ? (A.bg |= 67108864)
                                  : y === 4
                                    ? ((A.fg |= 268435456),
                                      this._processUnderline(
                                        R.hasSubParams(v)
                                          ? R.getSubParams(v)[0]
                                          : 1,
                                        A
                                      ))
                                    : y === 5
                                      ? (A.fg |= 536870912)
                                      : y === 7
                                        ? (A.fg |= 67108864)
                                        : y === 8
                                          ? (A.fg |= 1073741824)
                                          : y === 9
                                            ? (A.fg |= 2147483648)
                                            : y === 2
                                              ? (A.bg |= 134217728)
                                              : y === 21
                                                ? this._processUnderline(2, A)
                                                : y === 22
                                                  ? ((A.fg &= -134217729),
                                                    (A.bg &= -134217729))
                                                  : y === 23
                                                    ? (A.bg &= -67108865)
                                                    : y === 24
                                                      ? ((A.fg &= -268435457),
                                                        this._processUnderline(
                                                          0,
                                                          A
                                                        ))
                                                      : y === 25
                                                        ? (A.fg &= -536870913)
                                                        : y === 27
                                                          ? (A.fg &= -67108865)
                                                          : y === 28
                                                            ? (A.fg &=
                                                                -1073741825)
                                                            : y === 29
                                                              ? (A.fg &= 2147483647)
                                                              : y === 39
                                                                ? ((A.fg &=
                                                                    -67108864),
                                                                  (A.fg |=
                                                                    16777215 &
                                                                    Q
                                                                      .DEFAULT_ATTR_DATA
                                                                      .fg))
                                                                : y === 49
                                                                  ? ((A.bg &=
                                                                      -67108864),
                                                                    (A.bg |=
                                                                      16777215 &
                                                                      Q
                                                                        .DEFAULT_ATTR_DATA
                                                                        .bg))
                                                                  : y === 38 ||
                                                                      y ===
                                                                        48 ||
                                                                      y === 58
                                                                    ? (v +=
                                                                        this._extractColor(
                                                                          R,
                                                                          v,
                                                                          A
                                                                        ))
                                                                    : y === 53
                                                                      ? (A.bg |= 1073741824)
                                                                      : y === 55
                                                                        ? (A.bg &=
                                                                            -1073741825)
                                                                        : y ===
                                                                            59
                                                                          ? ((A.extended =
                                                                              A.extended.clone()),
                                                                            (A.extended.underlineColor =
                                                                              -1),
                                                                            A.updateExtended())
                                                                          : y ===
                                                                              100
                                                                            ? ((A.fg &=
                                                                                -67108864),
                                                                              (A.fg |=
                                                                                16777215 &
                                                                                Q
                                                                                  .DEFAULT_ATTR_DATA
                                                                                  .fg),
                                                                              (A.bg &=
                                                                                -67108864),
                                                                              (A.bg |=
                                                                                16777215 &
                                                                                Q
                                                                                  .DEFAULT_ATTR_DATA
                                                                                  .bg))
                                                                            : this._logService.debug(
                                                                                "Unknown SGR attribute: %d.",
                                                                                y
                                                                              );
                return !0;
              }
              deviceStatus(R) {
                switch (R.params[0]) {
                  case 5:
                    this._coreService.triggerDataEvent(`${q.C0.ESC}[0n`);
                    break;
                  case 6:
                    let D = this._activeBuffer.y + 1,
                      y = this._activeBuffer.x + 1;
                    this._coreService.triggerDataEvent(
                      `${q.C0.ESC}[${D};${y}R`
                    );
                }
                return !0;
              }
              deviceStatusPrivate(R) {
                if (R.params[0] === 6) {
                  let D = this._activeBuffer.y + 1,
                    y = this._activeBuffer.x + 1;
                  this._coreService.triggerDataEvent(`${q.C0.ESC}[?${D};${y}R`);
                }
                return !0;
              }
              softReset(R) {
                return (
                  (this._coreService.isCursorHidden = !1),
                  this._onRequestSyncScrollBar.fire(),
                  (this._activeBuffer.scrollTop = 0),
                  (this._activeBuffer.scrollBottom =
                    this._bufferService.rows - 1),
                  (this._curAttrData = Q.DEFAULT_ATTR_DATA.clone()),
                  this._coreService.reset(),
                  this._charsetService.reset(),
                  (this._activeBuffer.savedX = 0),
                  (this._activeBuffer.savedY = this._activeBuffer.ybase),
                  (this._activeBuffer.savedCurAttrData.fg =
                    this._curAttrData.fg),
                  (this._activeBuffer.savedCurAttrData.bg =
                    this._curAttrData.bg),
                  (this._activeBuffer.savedCharset =
                    this._charsetService.charset),
                  (this._coreService.decPrivateModes.origin = !1),
                  !0
                );
              }
              setCursorStyle(R) {
                let D = R.params[0] || 1;
                switch (D) {
                  case 1:
                  case 2:
                    this._optionsService.options.cursorStyle = "block";
                    break;
                  case 3:
                  case 4:
                    this._optionsService.options.cursorStyle = "underline";
                    break;
                  case 5:
                  case 6:
                    this._optionsService.options.cursorStyle = "bar";
                }
                let y = D % 2 == 1;
                return (this._optionsService.options.cursorBlink = y), !0;
              }
              setScrollRegion(R) {
                let D = R.params[0] || 1,
                  y;
                return (
                  (R.length < 2 ||
                    (y = R.params[1]) > this._bufferService.rows ||
                    y === 0) &&
                    (y = this._bufferService.rows),
                  y > D &&
                    ((this._activeBuffer.scrollTop = D - 1),
                    (this._activeBuffer.scrollBottom = y - 1),
                    this._setCursor(0, 0)),
                  !0
                );
              }
              windowOptions(R) {
                if (
                  !O(R.params[0], this._optionsService.rawOptions.windowOptions)
                )
                  return !0;
                let D = R.length > 1 ? R.params[1] : 0;
                switch (R.params[0]) {
                  case 14:
                    D !== 2 &&
                      this._onRequestWindowsOptionsReport.fire(
                        L.GET_WIN_SIZE_PIXELS
                      );
                    break;
                  case 16:
                    this._onRequestWindowsOptionsReport.fire(
                      L.GET_CELL_SIZE_PIXELS
                    );
                    break;
                  case 18:
                    this._bufferService &&
                      this._coreService.triggerDataEvent(
                        `${q.C0.ESC}[8;${this._bufferService.rows};${this._bufferService.cols}t`
                      );
                    break;
                  case 22:
                    (D !== 0 && D !== 2) ||
                      (this._windowTitleStack.push(this._windowTitle),
                      this._windowTitleStack.length > 10 &&
                        this._windowTitleStack.shift()),
                      (D !== 0 && D !== 1) ||
                        (this._iconNameStack.push(this._iconName),
                        this._iconNameStack.length > 10 &&
                          this._iconNameStack.shift());
                    break;
                  case 23:
                    (D !== 0 && D !== 2) ||
                      (this._windowTitleStack.length &&
                        this.setTitle(this._windowTitleStack.pop())),
                      (D !== 0 && D !== 1) ||
                        (this._iconNameStack.length &&
                          this.setIconName(this._iconNameStack.pop()));
                }
                return !0;
              }
              saveCursor(R) {
                return (
                  (this._activeBuffer.savedX = this._activeBuffer.x),
                  (this._activeBuffer.savedY =
                    this._activeBuffer.ybase + this._activeBuffer.y),
                  (this._activeBuffer.savedCurAttrData.fg =
                    this._curAttrData.fg),
                  (this._activeBuffer.savedCurAttrData.bg =
                    this._curAttrData.bg),
                  (this._activeBuffer.savedCharset =
                    this._charsetService.charset),
                  !0
                );
              }
              restoreCursor(R) {
                return (
                  (this._activeBuffer.x = this._activeBuffer.savedX || 0),
                  (this._activeBuffer.y = Math.max(
                    this._activeBuffer.savedY - this._activeBuffer.ybase,
                    0
                  )),
                  (this._curAttrData.fg =
                    this._activeBuffer.savedCurAttrData.fg),
                  (this._curAttrData.bg =
                    this._activeBuffer.savedCurAttrData.bg),
                  (this._charsetService.charset = this._savedCharset),
                  this._activeBuffer.savedCharset &&
                    (this._charsetService.charset =
                      this._activeBuffer.savedCharset),
                  this._restrictCursor(),
                  !0
                );
              }
              setTitle(R) {
                return (this._windowTitle = R), this._onTitleChange.fire(R), !0;
              }
              setIconName(R) {
                return (this._iconName = R), !0;
              }
              setOrReportIndexedColor(R) {
                let D = [],
                  y = R.split(";");
                for (; y.length > 1; ) {
                  let A = y.shift(),
                    v = y.shift();
                  if (/^\d+$/.exec(A)) {
                    let m = parseInt(A);
                    if (I(m))
                      if (v === "?") D.push({ type: 0, index: m });
                      else {
                        let p = (0, U.parseColor)(v);
                        p && D.push({ type: 1, index: m, color: p });
                      }
                  }
                }
                return D.length && this._onColor.fire(D), !0;
              }
              setHyperlink(R) {
                let D = R.split(";");
                return (
                  !(D.length < 2) &&
                  (D[1]
                    ? this._createHyperlink(D[0], D[1])
                    : !D[0] && this._finishHyperlink())
                );
              }
              _createHyperlink(R, D) {
                this._getCurrentLinkId() && this._finishHyperlink();
                let y = R.split(":"),
                  A,
                  v = y.findIndex((m) => m.startsWith("id="));
                return (
                  v !== -1 && (A = y[v].slice(3) || void 0),
                  (this._curAttrData.extended =
                    this._curAttrData.extended.clone()),
                  (this._curAttrData.extended.urlId =
                    this._oscLinkService.registerLink({ id: A, uri: D })),
                  this._curAttrData.updateExtended(),
                  !0
                );
              }
              _finishHyperlink() {
                return (
                  (this._curAttrData.extended =
                    this._curAttrData.extended.clone()),
                  (this._curAttrData.extended.urlId = 0),
                  this._curAttrData.updateExtended(),
                  !0
                );
              }
              _setOrReportSpecialColor(R, D) {
                let y = R.split(";");
                for (
                  let A = 0;
                  A < y.length && !(D >= this._specialColors.length);
                  ++A, ++D
                )
                  if (y[A] === "?")
                    this._onColor.fire([
                      { type: 0, index: this._specialColors[D] },
                    ]);
                  else {
                    let v = (0, U.parseColor)(y[A]);
                    v &&
                      this._onColor.fire([
                        { type: 1, index: this._specialColors[D], color: v },
                      ]);
                  }
                return !0;
              }
              setOrReportFgColor(R) {
                return this._setOrReportSpecialColor(R, 0);
              }
              setOrReportBgColor(R) {
                return this._setOrReportSpecialColor(R, 1);
              }
              setOrReportCursorColor(R) {
                return this._setOrReportSpecialColor(R, 2);
              }
              restoreIndexedColor(R) {
                if (!R) return this._onColor.fire([{ type: 2 }]), !0;
                let D = [],
                  y = R.split(";");
                for (let A = 0; A < y.length; ++A)
                  if (/^\d+$/.exec(y[A])) {
                    let v = parseInt(y[A]);
                    I(v) && D.push({ type: 2, index: v });
                  }
                return D.length && this._onColor.fire(D), !0;
              }
              restoreFgColor(R) {
                return this._onColor.fire([{ type: 2, index: 256 }]), !0;
              }
              restoreBgColor(R) {
                return this._onColor.fire([{ type: 2, index: 257 }]), !0;
              }
              restoreCursorColor(R) {
                return this._onColor.fire([{ type: 2, index: 258 }]), !0;
              }
              nextLine() {
                return (this._activeBuffer.x = 0), this.index(), !0;
              }
              keypadApplicationMode() {
                return (
                  this._logService.debug(
                    "Serial port requested application keypad."
                  ),
                  (this._coreService.decPrivateModes.applicationKeypad = !0),
                  this._onRequestSyncScrollBar.fire(),
                  !0
                );
              }
              keypadNumericMode() {
                return (
                  this._logService.debug("Switching back to normal keypad."),
                  (this._coreService.decPrivateModes.applicationKeypad = !1),
                  this._onRequestSyncScrollBar.fire(),
                  !0
                );
              }
              selectDefaultCharset() {
                return (
                  this._charsetService.setgLevel(0),
                  this._charsetService.setgCharset(0, J.DEFAULT_CHARSET),
                  !0
                );
              }
              selectCharset(R) {
                return R.length !== 2
                  ? (this.selectDefaultCharset(), !0)
                  : (R[0] === "/" ||
                      this._charsetService.setgCharset(
                        z[R[0]],
                        J.CHARSETS[R[1]] || J.DEFAULT_CHARSET
                      ),
                    !0);
              }
              index() {
                return (
                  this._restrictCursor(),
                  this._activeBuffer.y++,
                  this._activeBuffer.y === this._activeBuffer.scrollBottom + 1
                    ? (this._activeBuffer.y--,
                      this._bufferService.scroll(this._eraseAttrData()))
                    : this._activeBuffer.y >= this._bufferService.rows &&
                      (this._activeBuffer.y = this._bufferService.rows - 1),
                  this._restrictCursor(),
                  !0
                );
              }
              tabSet() {
                return (this._activeBuffer.tabs[this._activeBuffer.x] = !0), !0;
              }
              reverseIndex() {
                if (
                  (this._restrictCursor(),
                  this._activeBuffer.y === this._activeBuffer.scrollTop)
                ) {
                  let R =
                    this._activeBuffer.scrollBottom -
                    this._activeBuffer.scrollTop;
                  this._activeBuffer.lines.shiftElements(
                    this._activeBuffer.ybase + this._activeBuffer.y,
                    R,
                    1
                  ),
                    this._activeBuffer.lines.set(
                      this._activeBuffer.ybase + this._activeBuffer.y,
                      this._activeBuffer.getBlankLine(this._eraseAttrData())
                    ),
                    this._dirtyRowTracker.markRangeDirty(
                      this._activeBuffer.scrollTop,
                      this._activeBuffer.scrollBottom
                    );
                } else this._activeBuffer.y--, this._restrictCursor();
                return !0;
              }
              fullReset() {
                return this._parser.reset(), this._onRequestReset.fire(), !0;
              }
              reset() {
                (this._curAttrData = Q.DEFAULT_ATTR_DATA.clone()),
                  (this._eraseAttrDataInternal = Q.DEFAULT_ATTR_DATA.clone());
              }
              _eraseAttrData() {
                return (
                  (this._eraseAttrDataInternal.bg &= -67108864),
                  (this._eraseAttrDataInternal.bg |=
                    67108863 & this._curAttrData.bg),
                  this._eraseAttrDataInternal
                );
              }
              setgLevel(R) {
                return this._charsetService.setgLevel(R), !0;
              }
              screenAlignmentPattern() {
                let R = new Y.CellData();
                (R.content = 4194373),
                  (R.fg = this._curAttrData.fg),
                  (R.bg = this._curAttrData.bg),
                  this._setCursor(0, 0);
                for (let D = 0; D < this._bufferService.rows; ++D) {
                  let y = this._activeBuffer.ybase + this._activeBuffer.y + D,
                    A = this._activeBuffer.lines.get(y);
                  A && (A.fill(R), (A.isWrapped = !1));
                }
                return (
                  this._dirtyRowTracker.markAllDirty(),
                  this._setCursor(0, 0),
                  !0
                );
              }
              requestStatusString(R, D) {
                let y = this._bufferService.buffer,
                  A = this._optionsService.rawOptions;
                return ((v) => (
                  this._coreService.triggerDataEvent(
                    `${q.C0.ESC}${v}${q.C0.ESC}\\`
                  ),
                  !0
                ))(
                  R === '"q'
                    ? `P1$r${this._curAttrData.isProtected() ? 1 : 0}"q`
                    : R === '"p'
                      ? 'P1$r61;1"p'
                      : R === "r"
                        ? `P1$r${y.scrollTop + 1};${y.scrollBottom + 1}r`
                        : R === "m"
                          ? "P1$r0m"
                          : R === " q"
                            ? `P1$r${{ block: 2, underline: 4, bar: 6 }[A.cursorStyle] - (A.cursorBlink ? 1 : 0)} q`
                            : "P0$r"
                );
              }
              markRangeDirty(R, D) {
                this._dirtyRowTracker.markRangeDirty(R, D);
              }
            }
            H.InputHandler = B;
            let S = class {
              constructor(R) {
                (this._bufferService = R), this.clearRange();
              }
              clearRange() {
                (this.start = this._bufferService.buffer.y),
                  (this.end = this._bufferService.buffer.y);
              }
              markDirty(R) {
                R < this.start
                  ? (this.start = R)
                  : R > this.end && (this.end = R);
              }
              markRangeDirty(R, D) {
                R > D && ((b = R), (R = D), (D = b)),
                  R < this.start && (this.start = R),
                  D > this.end && (this.end = D);
              }
              markAllDirty() {
                this.markRangeDirty(0, this._bufferService.rows - 1);
              }
            };
            function I(R) {
              return 0 <= R && R < 256;
            }
            S = P([V(0, j.IBufferService)], S);
          },
          844: (M, H) => {
            function K(P) {
              for (let V of P) V.dispose();
              P.length = 0;
            }
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.getDisposeArrayDisposable =
                H.disposeArray =
                H.toDisposable =
                H.MutableDisposable =
                H.Disposable =
                  void 0),
              (H.Disposable = class {
                constructor() {
                  (this._disposables = []), (this._isDisposed = !1);
                }
                dispose() {
                  this._isDisposed = !0;
                  for (let P of this._disposables) P.dispose();
                  this._disposables.length = 0;
                }
                register(P) {
                  return this._disposables.push(P), P;
                }
                unregister(P) {
                  let V = this._disposables.indexOf(P);
                  V !== -1 && this._disposables.splice(V, 1);
                }
              }),
              (H.MutableDisposable = class {
                constructor() {
                  this._isDisposed = !1;
                }
                get value() {
                  return this._isDisposed ? void 0 : this._value;
                }
                set value(P) {
                  var V;
                  this._isDisposed ||
                    P === this._value ||
                    ((V = this._value) === null || V === void 0 || V.dispose(),
                    (this._value = P));
                }
                clear() {
                  this.value = void 0;
                }
                dispose() {
                  var P;
                  (this._isDisposed = !0),
                    (P = this._value) === null || P === void 0 || P.dispose(),
                    (this._value = void 0);
                }
              }),
              (H.toDisposable = function (P) {
                return { dispose: P };
              }),
              (H.disposeArray = K),
              (H.getDisposeArrayDisposable = function (P) {
                return { dispose: () => K(P) };
              });
          },
          1505: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.FourKeyMap = H.TwoKeyMap = void 0);
            class K {
              constructor() {
                this._data = {};
              }
              set(P, V, q) {
                this._data[P] || (this._data[P] = {}), (this._data[P][V] = q);
              }
              get(P, V) {
                return this._data[P] ? this._data[P][V] : void 0;
              }
              clear() {
                this._data = {};
              }
            }
            (H.TwoKeyMap = K),
              (H.FourKeyMap = class {
                constructor() {
                  this._data = new K();
                }
                set(P, V, q, J, N) {
                  this._data.get(P, V) || this._data.set(P, V, new K()),
                    this._data.get(P, V).set(q, J, N);
                }
                get(P, V, q, J) {
                  var N;
                  return (N = this._data.get(P, V)) === null || N === void 0
                    ? void 0
                    : N.get(q, J);
                }
                clear() {
                  this._data.clear();
                }
              });
          },
          6114: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.isChromeOS =
                H.isLinux =
                H.isWindows =
                H.isIphone =
                H.isIpad =
                H.isMac =
                H.getSafariVersion =
                H.isSafari =
                H.isLegacyEdge =
                H.isFirefox =
                H.isNode =
                  void 0),
              (H.isNode = typeof navigator > "u");
            let K = H.isNode ? "node" : navigator.userAgent,
              P = H.isNode ? "node" : navigator.platform;
            (H.isFirefox = K.includes("Firefox")),
              (H.isLegacyEdge = K.includes("Edge")),
              (H.isSafari = /^((?!chrome|android).)*safari/i.test(K)),
              (H.getSafariVersion = function () {
                if (!H.isSafari) return 0;
                let V = K.match(/Version\/(\d+)/);
                return V === null || V.length < 2 ? 0 : parseInt(V[1]);
              }),
              (H.isMac = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"].includes(
                P
              )),
              (H.isIpad = P === "iPad"),
              (H.isIphone = P === "iPhone"),
              (H.isWindows = ["Windows", "Win16", "Win32", "WinCE"].includes(
                P
              )),
              (H.isLinux = P.indexOf("Linux") >= 0),
              (H.isChromeOS = /\bCrOS\b/.test(K));
          },
          6106: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.SortedList = void 0);
            let K = 0;
            H.SortedList = class {
              constructor(P) {
                (this._getKey = P), (this._array = []);
              }
              clear() {
                this._array.length = 0;
              }
              insert(P) {
                this._array.length !== 0
                  ? ((K = this._search(this._getKey(P))),
                    this._array.splice(K, 0, P))
                  : this._array.push(P);
              }
              delete(P) {
                if (this._array.length === 0) return !1;
                let V = this._getKey(P);
                if (V === void 0) return !1;
                if (((K = this._search(V)), K === -1)) return !1;
                if (this._getKey(this._array[K]) !== V) return !1;
                do
                  if (this._array[K] === P) return this._array.splice(K, 1), !0;
                while (
                  ++K < this._array.length &&
                  this._getKey(this._array[K]) === V
                );
                return !1;
              }
              *getKeyIterator(P) {
                if (
                  this._array.length !== 0 &&
                  ((K = this._search(P)),
                  !(K < 0 || K >= this._array.length) &&
                    this._getKey(this._array[K]) === P)
                )
                  do yield this._array[K];
                  while (
                    ++K < this._array.length &&
                    this._getKey(this._array[K]) === P
                  );
              }
              forEachByKey(P, V) {
                if (
                  this._array.length !== 0 &&
                  ((K = this._search(P)),
                  !(K < 0 || K >= this._array.length) &&
                    this._getKey(this._array[K]) === P)
                )
                  do V(this._array[K]);
                  while (
                    ++K < this._array.length &&
                    this._getKey(this._array[K]) === P
                  );
              }
              values() {
                return [...this._array].values();
              }
              _search(P) {
                let V = 0,
                  q = this._array.length - 1;
                for (; q >= V; ) {
                  let J = (V + q) >> 1,
                    N = this._getKey(this._array[J]);
                  if (N > P) q = J - 1;
                  else {
                    if (!(N < P)) {
                      for (; J > 0 && this._getKey(this._array[J - 1]) === P; )
                        J--;
                      return J;
                    }
                    V = J + 1;
                  }
                }
                return V;
              }
            };
          },
          7226: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.DebouncedIdleTask =
                H.IdleTaskQueue =
                H.PriorityTaskQueue =
                  void 0);
            let P = K(6114);
            class V {
              constructor() {
                (this._tasks = []), (this._i = 0);
              }
              enqueue(J) {
                this._tasks.push(J), this._start();
              }
              flush() {
                for (; this._i < this._tasks.length; )
                  this._tasks[this._i]() || this._i++;
                this.clear();
              }
              clear() {
                this._idleCallback &&
                  (this._cancelCallback(this._idleCallback),
                  (this._idleCallback = void 0)),
                  (this._i = 0),
                  (this._tasks.length = 0);
              }
              _start() {
                this._idleCallback ||
                  (this._idleCallback = this._requestCallback(
                    this._process.bind(this)
                  ));
              }
              _process(J) {
                this._idleCallback = void 0;
                let N = 0,
                  X = 0,
                  G = J.timeRemaining(),
                  Q = 0;
                for (; this._i < this._tasks.length; ) {
                  if (
                    ((N = Date.now()),
                    this._tasks[this._i]() || this._i++,
                    (N = Math.max(1, Date.now() - N)),
                    (X = Math.max(N, X)),
                    (Q = J.timeRemaining()),
                    1.5 * X > Q)
                  )
                    return (
                      G - N < -20 &&
                        console.warn(
                          `task queue exceeded allotted deadline by ${Math.abs(Math.round(G - N))}ms`
                        ),
                      void this._start()
                    );
                  G = Q;
                }
                this.clear();
              }
            }
            class q extends V {
              _requestCallback(J) {
                return setTimeout(() => J(this._createDeadline(16)));
              }
              _cancelCallback(J) {
                clearTimeout(J);
              }
              _createDeadline(J) {
                let N = Date.now() + J;
                return { timeRemaining: () => Math.max(0, N - Date.now()) };
              }
            }
            (H.PriorityTaskQueue = q),
              (H.IdleTaskQueue =
                !P.isNode && "requestIdleCallback" in window
                  ? class extends V {
                      _requestCallback(J) {
                        return requestIdleCallback(J);
                      }
                      _cancelCallback(J) {
                        cancelIdleCallback(J);
                      }
                    }
                  : q),
              (H.DebouncedIdleTask = class {
                constructor() {
                  this._queue = new H.IdleTaskQueue();
                }
                set(J) {
                  this._queue.clear(), this._queue.enqueue(J);
                }
                flush() {
                  this._queue.flush();
                }
              });
          },
          9282: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.updateWindowsModeWrappedState = void 0);
            let P = K(643);
            H.updateWindowsModeWrappedState = function (V) {
              let q = V.buffer.lines.get(V.buffer.ybase + V.buffer.y - 1),
                J = q == null ? void 0 : q.get(V.cols - 1),
                N = V.buffer.lines.get(V.buffer.ybase + V.buffer.y);
              N &&
                J &&
                (N.isWrapped =
                  J[P.CHAR_DATA_CODE_INDEX] !== P.NULL_CELL_CODE &&
                  J[P.CHAR_DATA_CODE_INDEX] !== P.WHITESPACE_CELL_CODE);
            };
          },
          3734: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.ExtendedAttrs = H.AttributeData = void 0);
            class K {
              constructor() {
                (this.fg = 0), (this.bg = 0), (this.extended = new P());
              }
              static toColorRGB(V) {
                return [(V >>> 16) & 255, (V >>> 8) & 255, 255 & V];
              }
              static fromColorRGB(V) {
                return (
                  ((255 & V[0]) << 16) | ((255 & V[1]) << 8) | (255 & V[2])
                );
              }
              clone() {
                let V = new K();
                return (
                  (V.fg = this.fg),
                  (V.bg = this.bg),
                  (V.extended = this.extended.clone()),
                  V
                );
              }
              isInverse() {
                return 67108864 & this.fg;
              }
              isBold() {
                return 134217728 & this.fg;
              }
              isUnderline() {
                return this.hasExtendedAttrs() &&
                  this.extended.underlineStyle !== 0
                  ? 1
                  : 268435456 & this.fg;
              }
              isBlink() {
                return 536870912 & this.fg;
              }
              isInvisible() {
                return 1073741824 & this.fg;
              }
              isItalic() {
                return 67108864 & this.bg;
              }
              isDim() {
                return 134217728 & this.bg;
              }
              isStrikethrough() {
                return 2147483648 & this.fg;
              }
              isProtected() {
                return 536870912 & this.bg;
              }
              isOverline() {
                return 1073741824 & this.bg;
              }
              getFgColorMode() {
                return 50331648 & this.fg;
              }
              getBgColorMode() {
                return 50331648 & this.bg;
              }
              isFgRGB() {
                return (50331648 & this.fg) == 50331648;
              }
              isBgRGB() {
                return (50331648 & this.bg) == 50331648;
              }
              isFgPalette() {
                return (
                  (50331648 & this.fg) == 16777216 ||
                  (50331648 & this.fg) == 33554432
                );
              }
              isBgPalette() {
                return (
                  (50331648 & this.bg) == 16777216 ||
                  (50331648 & this.bg) == 33554432
                );
              }
              isFgDefault() {
                return (50331648 & this.fg) == 0;
              }
              isBgDefault() {
                return (50331648 & this.bg) == 0;
              }
              isAttributeDefault() {
                return this.fg === 0 && this.bg === 0;
              }
              getFgColor() {
                switch (50331648 & this.fg) {
                  case 16777216:
                  case 33554432:
                    return 255 & this.fg;
                  case 50331648:
                    return 16777215 & this.fg;
                  default:
                    return -1;
                }
              }
              getBgColor() {
                switch (50331648 & this.bg) {
                  case 16777216:
                  case 33554432:
                    return 255 & this.bg;
                  case 50331648:
                    return 16777215 & this.bg;
                  default:
                    return -1;
                }
              }
              hasExtendedAttrs() {
                return 268435456 & this.bg;
              }
              updateExtended() {
                this.extended.isEmpty()
                  ? (this.bg &= -268435457)
                  : (this.bg |= 268435456);
              }
              getUnderlineColor() {
                if (268435456 & this.bg && ~this.extended.underlineColor)
                  switch (50331648 & this.extended.underlineColor) {
                    case 16777216:
                    case 33554432:
                      return 255 & this.extended.underlineColor;
                    case 50331648:
                      return 16777215 & this.extended.underlineColor;
                    default:
                      return this.getFgColor();
                  }
                return this.getFgColor();
              }
              getUnderlineColorMode() {
                return 268435456 & this.bg && ~this.extended.underlineColor
                  ? 50331648 & this.extended.underlineColor
                  : this.getFgColorMode();
              }
              isUnderlineColorRGB() {
                return 268435456 & this.bg && ~this.extended.underlineColor
                  ? (50331648 & this.extended.underlineColor) == 50331648
                  : this.isFgRGB();
              }
              isUnderlineColorPalette() {
                return 268435456 & this.bg && ~this.extended.underlineColor
                  ? (50331648 & this.extended.underlineColor) == 16777216 ||
                      (50331648 & this.extended.underlineColor) == 33554432
                  : this.isFgPalette();
              }
              isUnderlineColorDefault() {
                return 268435456 & this.bg && ~this.extended.underlineColor
                  ? (50331648 & this.extended.underlineColor) == 0
                  : this.isFgDefault();
              }
              getUnderlineStyle() {
                return 268435456 & this.fg
                  ? 268435456 & this.bg
                    ? this.extended.underlineStyle
                    : 1
                  : 0;
              }
            }
            H.AttributeData = K;
            class P {
              get ext() {
                return this._urlId
                  ? (-469762049 & this._ext) | (this.underlineStyle << 26)
                  : this._ext;
              }
              set ext(V) {
                this._ext = V;
              }
              get underlineStyle() {
                return this._urlId ? 5 : (469762048 & this._ext) >> 26;
              }
              set underlineStyle(V) {
                (this._ext &= -469762049), (this._ext |= (V << 26) & 469762048);
              }
              get underlineColor() {
                return 67108863 & this._ext;
              }
              set underlineColor(V) {
                (this._ext &= -67108864), (this._ext |= 67108863 & V);
              }
              get urlId() {
                return this._urlId;
              }
              set urlId(V) {
                this._urlId = V;
              }
              constructor(V = 0, q = 0) {
                (this._ext = 0),
                  (this._urlId = 0),
                  (this._ext = V),
                  (this._urlId = q);
              }
              clone() {
                return new P(this._ext, this._urlId);
              }
              isEmpty() {
                return this.underlineStyle === 0 && this._urlId === 0;
              }
            }
            H.ExtendedAttrs = P;
          },
          9092: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.Buffer = H.MAX_BUFFER_SIZE = void 0);
            let P = K(6349),
              V = K(7226),
              q = K(3734),
              J = K(8437),
              N = K(4634),
              X = K(511),
              G = K(643),
              Q = K(4863),
              W = K(7116);
            (H.MAX_BUFFER_SIZE = 4294967295),
              (H.Buffer = class {
                constructor(Z, Y, F) {
                  (this._hasScrollback = Z),
                    (this._optionsService = Y),
                    (this._bufferService = F),
                    (this.ydisp = 0),
                    (this.ybase = 0),
                    (this.y = 0),
                    (this.x = 0),
                    (this.tabs = {}),
                    (this.savedY = 0),
                    (this.savedX = 0),
                    (this.savedCurAttrData = J.DEFAULT_ATTR_DATA.clone()),
                    (this.savedCharset = W.DEFAULT_CHARSET),
                    (this.markers = []),
                    (this._nullCell = X.CellData.fromCharData([
                      0,
                      G.NULL_CELL_CHAR,
                      G.NULL_CELL_WIDTH,
                      G.NULL_CELL_CODE,
                    ])),
                    (this._whitespaceCell = X.CellData.fromCharData([
                      0,
                      G.WHITESPACE_CELL_CHAR,
                      G.WHITESPACE_CELL_WIDTH,
                      G.WHITESPACE_CELL_CODE,
                    ])),
                    (this._isClearing = !1),
                    (this._memoryCleanupQueue = new V.IdleTaskQueue()),
                    (this._memoryCleanupPosition = 0),
                    (this._cols = this._bufferService.cols),
                    (this._rows = this._bufferService.rows),
                    (this.lines = new P.CircularList(
                      this._getCorrectBufferLength(this._rows)
                    )),
                    (this.scrollTop = 0),
                    (this.scrollBottom = this._rows - 1),
                    this.setupTabStops();
                }
                getNullCell(Z) {
                  return (
                    Z
                      ? ((this._nullCell.fg = Z.fg),
                        (this._nullCell.bg = Z.bg),
                        (this._nullCell.extended = Z.extended))
                      : ((this._nullCell.fg = 0),
                        (this._nullCell.bg = 0),
                        (this._nullCell.extended = new q.ExtendedAttrs())),
                    this._nullCell
                  );
                }
                getWhitespaceCell(Z) {
                  return (
                    Z
                      ? ((this._whitespaceCell.fg = Z.fg),
                        (this._whitespaceCell.bg = Z.bg),
                        (this._whitespaceCell.extended = Z.extended))
                      : ((this._whitespaceCell.fg = 0),
                        (this._whitespaceCell.bg = 0),
                        (this._whitespaceCell.extended =
                          new q.ExtendedAttrs())),
                    this._whitespaceCell
                  );
                }
                getBlankLine(Z, Y) {
                  return new J.BufferLine(
                    this._bufferService.cols,
                    this.getNullCell(Z),
                    Y
                  );
                }
                get hasScrollback() {
                  return (
                    this._hasScrollback && this.lines.maxLength > this._rows
                  );
                }
                get isCursorInViewport() {
                  let Z = this.ybase + this.y - this.ydisp;
                  return Z >= 0 && Z < this._rows;
                }
                _getCorrectBufferLength(Z) {
                  if (!this._hasScrollback) return Z;
                  let Y = Z + this._optionsService.rawOptions.scrollback;
                  return Y > H.MAX_BUFFER_SIZE ? H.MAX_BUFFER_SIZE : Y;
                }
                fillViewportRows(Z) {
                  if (this.lines.length === 0) {
                    Z === void 0 && (Z = J.DEFAULT_ATTR_DATA);
                    let Y = this._rows;
                    for (; Y--; ) this.lines.push(this.getBlankLine(Z));
                  }
                }
                clear() {
                  (this.ydisp = 0),
                    (this.ybase = 0),
                    (this.y = 0),
                    (this.x = 0),
                    (this.lines = new P.CircularList(
                      this._getCorrectBufferLength(this._rows)
                    )),
                    (this.scrollTop = 0),
                    (this.scrollBottom = this._rows - 1),
                    this.setupTabStops();
                }
                resize(Z, Y) {
                  let F = this.getNullCell(J.DEFAULT_ATTR_DATA),
                    j = 0,
                    $ = this._getCorrectBufferLength(Y);
                  if (
                    ($ > this.lines.maxLength && (this.lines.maxLength = $),
                    this.lines.length > 0)
                  ) {
                    if (this._cols < Z)
                      for (let U = 0; U < this.lines.length; U++)
                        j += +this.lines.get(U).resize(Z, F);
                    let E = 0;
                    if (this._rows < Y)
                      for (let U = this._rows; U < Y; U++)
                        this.lines.length < Y + this.ybase &&
                          (this._optionsService.rawOptions.windowsMode ||
                          this._optionsService.rawOptions.windowsPty.backend !==
                            void 0 ||
                          this._optionsService.rawOptions.windowsPty
                            .buildNumber !== void 0
                            ? this.lines.push(new J.BufferLine(Z, F))
                            : this.ybase > 0 &&
                                this.lines.length <= this.ybase + this.y + E + 1
                              ? (this.ybase--,
                                E++,
                                this.ydisp > 0 && this.ydisp--)
                              : this.lines.push(new J.BufferLine(Z, F)));
                    else
                      for (let U = this._rows; U > Y; U--)
                        this.lines.length > Y + this.ybase &&
                          (this.lines.length > this.ybase + this.y + 1
                            ? this.lines.pop()
                            : (this.ybase++, this.ydisp++));
                    if ($ < this.lines.maxLength) {
                      let U = this.lines.length - $;
                      U > 0 &&
                        (this.lines.trimStart(U),
                        (this.ybase = Math.max(this.ybase - U, 0)),
                        (this.ydisp = Math.max(this.ydisp - U, 0)),
                        (this.savedY = Math.max(this.savedY - U, 0))),
                        (this.lines.maxLength = $);
                    }
                    (this.x = Math.min(this.x, Z - 1)),
                      (this.y = Math.min(this.y, Y - 1)),
                      E && (this.y += E),
                      (this.savedX = Math.min(this.savedX, Z - 1)),
                      (this.scrollTop = 0);
                  }
                  if (
                    ((this.scrollBottom = Y - 1),
                    this._isReflowEnabled &&
                      (this._reflow(Z, Y), this._cols > Z))
                  )
                    for (let E = 0; E < this.lines.length; E++)
                      j += +this.lines.get(E).resize(Z, F);
                  (this._cols = Z),
                    (this._rows = Y),
                    this._memoryCleanupQueue.clear(),
                    j > 0.1 * this.lines.length &&
                      ((this._memoryCleanupPosition = 0),
                      this._memoryCleanupQueue.enqueue(() =>
                        this._batchedMemoryCleanup()
                      ));
                }
                _batchedMemoryCleanup() {
                  let Z = !0;
                  this._memoryCleanupPosition >= this.lines.length &&
                    ((this._memoryCleanupPosition = 0), (Z = !1));
                  let Y = 0;
                  for (; this._memoryCleanupPosition < this.lines.length; )
                    if (
                      ((Y += this.lines
                        .get(this._memoryCleanupPosition++)
                        .cleanupMemory()),
                      Y > 100)
                    )
                      return !0;
                  return Z;
                }
                get _isReflowEnabled() {
                  let Z = this._optionsService.rawOptions.windowsPty;
                  return Z && Z.buildNumber
                    ? this._hasScrollback &&
                        Z.backend === "conpty" &&
                        Z.buildNumber >= 21376
                    : this._hasScrollback &&
                        !this._optionsService.rawOptions.windowsMode;
                }
                _reflow(Z, Y) {
                  this._cols !== Z &&
                    (Z > this._cols
                      ? this._reflowLarger(Z, Y)
                      : this._reflowSmaller(Z, Y));
                }
                _reflowLarger(Z, Y) {
                  let F = (0, N.reflowLargerGetLinesToRemove)(
                    this.lines,
                    this._cols,
                    Z,
                    this.ybase + this.y,
                    this.getNullCell(J.DEFAULT_ATTR_DATA)
                  );
                  if (F.length > 0) {
                    let j = (0, N.reflowLargerCreateNewLayout)(this.lines, F);
                    (0, N.reflowLargerApplyNewLayout)(this.lines, j.layout),
                      this._reflowLargerAdjustViewport(Z, Y, j.countRemoved);
                  }
                }
                _reflowLargerAdjustViewport(Z, Y, F) {
                  let j = this.getNullCell(J.DEFAULT_ATTR_DATA),
                    $ = F;
                  for (; $-- > 0; )
                    this.ybase === 0
                      ? (this.y > 0 && this.y--,
                        this.lines.length < Y &&
                          this.lines.push(new J.BufferLine(Z, j)))
                      : (this.ydisp === this.ybase && this.ydisp--,
                        this.ybase--);
                  this.savedY = Math.max(this.savedY - F, 0);
                }
                _reflowSmaller(Z, Y) {
                  let F = this.getNullCell(J.DEFAULT_ATTR_DATA),
                    j = [],
                    $ = 0;
                  for (let E = this.lines.length - 1; E >= 0; E--) {
                    let U = this.lines.get(E);
                    if (!U || (!U.isWrapped && U.getTrimmedLength() <= Z))
                      continue;
                    let z = [U];
                    for (; U.isWrapped && E > 0; )
                      (U = this.lines.get(--E)), z.unshift(U);
                    let k = this.ybase + this.y;
                    if (k >= E && k < E + z.length) continue;
                    let O = z[z.length - 1].getTrimmedLength(),
                      L = (0, N.reflowSmallerGetNewLineLengths)(
                        z,
                        this._cols,
                        Z
                      ),
                      b = L.length - z.length,
                      B;
                    B =
                      this.ybase === 0 && this.y !== this.lines.length - 1
                        ? Math.max(0, this.y - this.lines.maxLength + b)
                        : Math.max(
                            0,
                            this.lines.length - this.lines.maxLength + b
                          );
                    let S = [];
                    for (let v = 0; v < b; v++) {
                      let m = this.getBlankLine(J.DEFAULT_ATTR_DATA, !0);
                      S.push(m);
                    }
                    S.length > 0 &&
                      (j.push({ start: E + z.length + $, newLines: S }),
                      ($ += S.length)),
                      z.push(...S);
                    let I = L.length - 1,
                      R = L[I];
                    R === 0 && (I--, (R = L[I]));
                    let D = z.length - b - 1,
                      y = O;
                    for (; D >= 0; ) {
                      let v = Math.min(y, R);
                      if (z[I] === void 0) break;
                      if (
                        (z[I].copyCellsFrom(z[D], y - v, R - v, v, !0),
                        (R -= v),
                        R === 0 && (I--, (R = L[I])),
                        (y -= v),
                        y === 0)
                      ) {
                        D--;
                        let m = Math.max(D, 0);
                        y = (0, N.getWrappedLineTrimmedLength)(
                          z,
                          m,
                          this._cols
                        );
                      }
                    }
                    for (let v = 0; v < z.length; v++)
                      L[v] < Z && z[v].setCell(L[v], F);
                    let A = b - B;
                    for (; A-- > 0; )
                      this.ybase === 0
                        ? this.y < Y - 1
                          ? (this.y++, this.lines.pop())
                          : (this.ybase++, this.ydisp++)
                        : this.ybase <
                            Math.min(
                              this.lines.maxLength,
                              this.lines.length + $
                            ) -
                              Y &&
                          (this.ybase === this.ydisp && this.ydisp++,
                          this.ybase++);
                    this.savedY = Math.min(this.savedY + b, this.ybase + Y - 1);
                  }
                  if (j.length > 0) {
                    let E = [],
                      U = [];
                    for (let I = 0; I < this.lines.length; I++)
                      U.push(this.lines.get(I));
                    let z = this.lines.length,
                      k = z - 1,
                      O = 0,
                      L = j[O];
                    this.lines.length = Math.min(
                      this.lines.maxLength,
                      this.lines.length + $
                    );
                    let b = 0;
                    for (
                      let I = Math.min(this.lines.maxLength - 1, z + $ - 1);
                      I >= 0;
                      I--
                    )
                      if (L && L.start > k + b) {
                        for (let R = L.newLines.length - 1; R >= 0; R--)
                          this.lines.set(I--, L.newLines[R]);
                        I++,
                          E.push({ index: k + 1, amount: L.newLines.length }),
                          (b += L.newLines.length),
                          (L = j[++O]);
                      } else this.lines.set(I, U[k--]);
                    let B = 0;
                    for (let I = E.length - 1; I >= 0; I--)
                      (E[I].index += B),
                        this.lines.onInsertEmitter.fire(E[I]),
                        (B += E[I].amount);
                    let S = Math.max(0, z + $ - this.lines.maxLength);
                    S > 0 && this.lines.onTrimEmitter.fire(S);
                  }
                }
                translateBufferLineToString(Z, Y, F = 0, j) {
                  let $ = this.lines.get(Z);
                  return $ ? $.translateToString(Y, F, j) : "";
                }
                getWrappedRangeForLine(Z) {
                  let Y = Z,
                    F = Z;
                  for (; Y > 0 && this.lines.get(Y).isWrapped; ) Y--;
                  for (
                    ;
                    F + 1 < this.lines.length &&
                    this.lines.get(F + 1).isWrapped;
                  )
                    F++;
                  return { first: Y, last: F };
                }
                setupTabStops(Z) {
                  for (
                    Z != null
                      ? this.tabs[Z] || (Z = this.prevStop(Z))
                      : ((this.tabs = {}), (Z = 0));
                    Z < this._cols;
                    Z += this._optionsService.rawOptions.tabStopWidth
                  )
                    this.tabs[Z] = !0;
                }
                prevStop(Z) {
                  for (Z == null && (Z = this.x); !this.tabs[--Z] && Z > 0; );
                  return Z >= this._cols ? this._cols - 1 : Z < 0 ? 0 : Z;
                }
                nextStop(Z) {
                  for (
                    Z == null && (Z = this.x);
                    !this.tabs[++Z] && Z < this._cols;
                  );
                  return Z >= this._cols ? this._cols - 1 : Z < 0 ? 0 : Z;
                }
                clearMarkers(Z) {
                  this._isClearing = !0;
                  for (let Y = 0; Y < this.markers.length; Y++)
                    this.markers[Y].line === Z &&
                      (this.markers[Y].dispose(), this.markers.splice(Y--, 1));
                  this._isClearing = !1;
                }
                clearAllMarkers() {
                  this._isClearing = !0;
                  for (let Z = 0; Z < this.markers.length; Z++)
                    this.markers[Z].dispose(), this.markers.splice(Z--, 1);
                  this._isClearing = !1;
                }
                addMarker(Z) {
                  let Y = new Q.Marker(Z);
                  return (
                    this.markers.push(Y),
                    Y.register(
                      this.lines.onTrim((F) => {
                        (Y.line -= F), Y.line < 0 && Y.dispose();
                      })
                    ),
                    Y.register(
                      this.lines.onInsert((F) => {
                        Y.line >= F.index && (Y.line += F.amount);
                      })
                    ),
                    Y.register(
                      this.lines.onDelete((F) => {
                        Y.line >= F.index &&
                          Y.line < F.index + F.amount &&
                          Y.dispose(),
                          Y.line > F.index && (Y.line -= F.amount);
                      })
                    ),
                    Y.register(Y.onDispose(() => this._removeMarker(Y))),
                    Y
                  );
                }
                _removeMarker(Z) {
                  this._isClearing ||
                    this.markers.splice(this.markers.indexOf(Z), 1);
                }
              });
          },
          8437: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.BufferLine = H.DEFAULT_ATTR_DATA = void 0);
            let P = K(3734),
              V = K(511),
              q = K(643),
              J = K(482);
            H.DEFAULT_ATTR_DATA = Object.freeze(new P.AttributeData());
            let N = 0;
            class X {
              constructor(G, Q, W = !1) {
                (this.isWrapped = W),
                  (this._combined = {}),
                  (this._extendedAttrs = {}),
                  (this._data = new Uint32Array(3 * G));
                let Z =
                  Q ||
                  V.CellData.fromCharData([
                    0,
                    q.NULL_CELL_CHAR,
                    q.NULL_CELL_WIDTH,
                    q.NULL_CELL_CODE,
                  ]);
                for (let Y = 0; Y < G; ++Y) this.setCell(Y, Z);
                this.length = G;
              }
              get(G) {
                let Q = this._data[3 * G + 0],
                  W = 2097151 & Q;
                return [
                  this._data[3 * G + 1],
                  2097152 & Q
                    ? this._combined[G]
                    : W
                      ? (0, J.stringFromCodePoint)(W)
                      : "",
                  Q >> 22,
                  2097152 & Q
                    ? this._combined[G].charCodeAt(this._combined[G].length - 1)
                    : W,
                ];
              }
              set(G, Q) {
                (this._data[3 * G + 1] = Q[q.CHAR_DATA_ATTR_INDEX]),
                  Q[q.CHAR_DATA_CHAR_INDEX].length > 1
                    ? ((this._combined[G] = Q[1]),
                      (this._data[3 * G + 0] =
                        2097152 | G | (Q[q.CHAR_DATA_WIDTH_INDEX] << 22)))
                    : (this._data[3 * G + 0] =
                        Q[q.CHAR_DATA_CHAR_INDEX].charCodeAt(0) |
                        (Q[q.CHAR_DATA_WIDTH_INDEX] << 22));
              }
              getWidth(G) {
                return this._data[3 * G + 0] >> 22;
              }
              hasWidth(G) {
                return 12582912 & this._data[3 * G + 0];
              }
              getFg(G) {
                return this._data[3 * G + 1];
              }
              getBg(G) {
                return this._data[3 * G + 2];
              }
              hasContent(G) {
                return 4194303 & this._data[3 * G + 0];
              }
              getCodePoint(G) {
                let Q = this._data[3 * G + 0];
                return 2097152 & Q
                  ? this._combined[G].charCodeAt(this._combined[G].length - 1)
                  : 2097151 & Q;
              }
              isCombined(G) {
                return 2097152 & this._data[3 * G + 0];
              }
              getString(G) {
                let Q = this._data[3 * G + 0];
                return 2097152 & Q
                  ? this._combined[G]
                  : 2097151 & Q
                    ? (0, J.stringFromCodePoint)(2097151 & Q)
                    : "";
              }
              isProtected(G) {
                return 536870912 & this._data[3 * G + 2];
              }
              loadCell(G, Q) {
                return (
                  (N = 3 * G),
                  (Q.content = this._data[N + 0]),
                  (Q.fg = this._data[N + 1]),
                  (Q.bg = this._data[N + 2]),
                  2097152 & Q.content && (Q.combinedData = this._combined[G]),
                  268435456 & Q.bg && (Q.extended = this._extendedAttrs[G]),
                  Q
                );
              }
              setCell(G, Q) {
                2097152 & Q.content && (this._combined[G] = Q.combinedData),
                  268435456 & Q.bg && (this._extendedAttrs[G] = Q.extended),
                  (this._data[3 * G + 0] = Q.content),
                  (this._data[3 * G + 1] = Q.fg),
                  (this._data[3 * G + 2] = Q.bg);
              }
              setCellFromCodePoint(G, Q, W, Z, Y, F) {
                268435456 & Y && (this._extendedAttrs[G] = F),
                  (this._data[3 * G + 0] = Q | (W << 22)),
                  (this._data[3 * G + 1] = Z),
                  (this._data[3 * G + 2] = Y);
              }
              addCodepointToCell(G, Q) {
                let W = this._data[3 * G + 0];
                2097152 & W
                  ? (this._combined[G] += (0, J.stringFromCodePoint)(Q))
                  : (2097151 & W
                      ? ((this._combined[G] =
                          (0, J.stringFromCodePoint)(2097151 & W) +
                          (0, J.stringFromCodePoint)(Q)),
                        (W &= -2097152),
                        (W |= 2097152))
                      : (W = Q | 4194304),
                    (this._data[3 * G + 0] = W));
              }
              insertCells(G, Q, W, Z) {
                if (
                  ((G %= this.length) &&
                    this.getWidth(G - 1) === 2 &&
                    this.setCellFromCodePoint(
                      G - 1,
                      0,
                      1,
                      (Z == null ? void 0 : Z.fg) || 0,
                      (Z == null ? void 0 : Z.bg) || 0,
                      (Z == null ? void 0 : Z.extended) || new P.ExtendedAttrs()
                    ),
                  Q < this.length - G)
                ) {
                  let Y = new V.CellData();
                  for (let F = this.length - G - Q - 1; F >= 0; --F)
                    this.setCell(G + Q + F, this.loadCell(G + F, Y));
                  for (let F = 0; F < Q; ++F) this.setCell(G + F, W);
                } else for (let Y = G; Y < this.length; ++Y) this.setCell(Y, W);
                this.getWidth(this.length - 1) === 2 &&
                  this.setCellFromCodePoint(
                    this.length - 1,
                    0,
                    1,
                    (Z == null ? void 0 : Z.fg) || 0,
                    (Z == null ? void 0 : Z.bg) || 0,
                    (Z == null ? void 0 : Z.extended) || new P.ExtendedAttrs()
                  );
              }
              deleteCells(G, Q, W, Z) {
                if (((G %= this.length), Q < this.length - G)) {
                  let Y = new V.CellData();
                  for (let F = 0; F < this.length - G - Q; ++F)
                    this.setCell(G + F, this.loadCell(G + Q + F, Y));
                  for (let F = this.length - Q; F < this.length; ++F)
                    this.setCell(F, W);
                } else for (let Y = G; Y < this.length; ++Y) this.setCell(Y, W);
                G &&
                  this.getWidth(G - 1) === 2 &&
                  this.setCellFromCodePoint(
                    G - 1,
                    0,
                    1,
                    (Z == null ? void 0 : Z.fg) || 0,
                    (Z == null ? void 0 : Z.bg) || 0,
                    (Z == null ? void 0 : Z.extended) || new P.ExtendedAttrs()
                  ),
                  this.getWidth(G) !== 0 ||
                    this.hasContent(G) ||
                    this.setCellFromCodePoint(
                      G,
                      0,
                      1,
                      (Z == null ? void 0 : Z.fg) || 0,
                      (Z == null ? void 0 : Z.bg) || 0,
                      (Z == null ? void 0 : Z.extended) || new P.ExtendedAttrs()
                    );
              }
              replaceCells(G, Q, W, Z, Y = !1) {
                if (Y)
                  for (
                    G &&
                      this.getWidth(G - 1) === 2 &&
                      !this.isProtected(G - 1) &&
                      this.setCellFromCodePoint(
                        G - 1,
                        0,
                        1,
                        (Z == null ? void 0 : Z.fg) || 0,
                        (Z == null ? void 0 : Z.bg) || 0,
                        (Z == null ? void 0 : Z.extended) ||
                          new P.ExtendedAttrs()
                      ),
                      Q < this.length &&
                        this.getWidth(Q - 1) === 2 &&
                        !this.isProtected(Q) &&
                        this.setCellFromCodePoint(
                          Q,
                          0,
                          1,
                          (Z == null ? void 0 : Z.fg) || 0,
                          (Z == null ? void 0 : Z.bg) || 0,
                          (Z == null ? void 0 : Z.extended) ||
                            new P.ExtendedAttrs()
                        );
                    G < Q && G < this.length;
                  )
                    this.isProtected(G) || this.setCell(G, W), G++;
                else
                  for (
                    G &&
                      this.getWidth(G - 1) === 2 &&
                      this.setCellFromCodePoint(
                        G - 1,
                        0,
                        1,
                        (Z == null ? void 0 : Z.fg) || 0,
                        (Z == null ? void 0 : Z.bg) || 0,
                        (Z == null ? void 0 : Z.extended) ||
                          new P.ExtendedAttrs()
                      ),
                      Q < this.length &&
                        this.getWidth(Q - 1) === 2 &&
                        this.setCellFromCodePoint(
                          Q,
                          0,
                          1,
                          (Z == null ? void 0 : Z.fg) || 0,
                          (Z == null ? void 0 : Z.bg) || 0,
                          (Z == null ? void 0 : Z.extended) ||
                            new P.ExtendedAttrs()
                        );
                    G < Q && G < this.length;
                  )
                    this.setCell(G++, W);
              }
              resize(G, Q) {
                if (G === this.length)
                  return (
                    4 * this._data.length * 2 < this._data.buffer.byteLength
                  );
                let W = 3 * G;
                if (G > this.length) {
                  if (this._data.buffer.byteLength >= 4 * W)
                    this._data = new Uint32Array(this._data.buffer, 0, W);
                  else {
                    let Z = new Uint32Array(W);
                    Z.set(this._data), (this._data = Z);
                  }
                  for (let Z = this.length; Z < G; ++Z) this.setCell(Z, Q);
                } else {
                  this._data = this._data.subarray(0, W);
                  let Z = Object.keys(this._combined);
                  for (let F = 0; F < Z.length; F++) {
                    let j = parseInt(Z[F], 10);
                    j >= G && delete this._combined[j];
                  }
                  let Y = Object.keys(this._extendedAttrs);
                  for (let F = 0; F < Y.length; F++) {
                    let j = parseInt(Y[F], 10);
                    j >= G && delete this._extendedAttrs[j];
                  }
                }
                return (
                  (this.length = G), 4 * W * 2 < this._data.buffer.byteLength
                );
              }
              cleanupMemory() {
                if (4 * this._data.length * 2 < this._data.buffer.byteLength) {
                  let G = new Uint32Array(this._data.length);
                  return G.set(this._data), (this._data = G), 1;
                }
                return 0;
              }
              fill(G, Q = !1) {
                if (Q)
                  for (let W = 0; W < this.length; ++W)
                    this.isProtected(W) || this.setCell(W, G);
                else {
                  (this._combined = {}), (this._extendedAttrs = {});
                  for (let W = 0; W < this.length; ++W) this.setCell(W, G);
                }
              }
              copyFrom(G) {
                this.length !== G.length
                  ? (this._data = new Uint32Array(G._data))
                  : this._data.set(G._data),
                  (this.length = G.length),
                  (this._combined = {});
                for (let Q in G._combined) this._combined[Q] = G._combined[Q];
                this._extendedAttrs = {};
                for (let Q in G._extendedAttrs)
                  this._extendedAttrs[Q] = G._extendedAttrs[Q];
                this.isWrapped = G.isWrapped;
              }
              clone() {
                let G = new X(0);
                (G._data = new Uint32Array(this._data)),
                  (G.length = this.length);
                for (let Q in this._combined)
                  G._combined[Q] = this._combined[Q];
                for (let Q in this._extendedAttrs)
                  G._extendedAttrs[Q] = this._extendedAttrs[Q];
                return (G.isWrapped = this.isWrapped), G;
              }
              getTrimmedLength() {
                for (let G = this.length - 1; G >= 0; --G)
                  if (4194303 & this._data[3 * G + 0])
                    return G + (this._data[3 * G + 0] >> 22);
                return 0;
              }
              getNoBgTrimmedLength() {
                for (let G = this.length - 1; G >= 0; --G)
                  if (
                    4194303 & this._data[3 * G + 0] ||
                    50331648 & this._data[3 * G + 2]
                  )
                    return G + (this._data[3 * G + 0] >> 22);
                return 0;
              }
              copyCellsFrom(G, Q, W, Z, Y) {
                let F = G._data;
                if (Y)
                  for (let $ = Z - 1; $ >= 0; $--) {
                    for (let E = 0; E < 3; E++)
                      this._data[3 * (W + $) + E] = F[3 * (Q + $) + E];
                    268435456 & F[3 * (Q + $) + 2] &&
                      (this._extendedAttrs[W + $] = G._extendedAttrs[Q + $]);
                  }
                else
                  for (let $ = 0; $ < Z; $++) {
                    for (let E = 0; E < 3; E++)
                      this._data[3 * (W + $) + E] = F[3 * (Q + $) + E];
                    268435456 & F[3 * (Q + $) + 2] &&
                      (this._extendedAttrs[W + $] = G._extendedAttrs[Q + $]);
                  }
                let j = Object.keys(G._combined);
                for (let $ = 0; $ < j.length; $++) {
                  let E = parseInt(j[$], 10);
                  E >= Q && (this._combined[E - Q + W] = G._combined[E]);
                }
              }
              translateToString(G = !1, Q = 0, W = this.length) {
                G && (W = Math.min(W, this.getTrimmedLength()));
                let Z = "";
                for (; Q < W; ) {
                  let Y = this._data[3 * Q + 0],
                    F = 2097151 & Y;
                  (Z +=
                    2097152 & Y
                      ? this._combined[Q]
                      : F
                        ? (0, J.stringFromCodePoint)(F)
                        : q.WHITESPACE_CELL_CHAR),
                    (Q += Y >> 22 || 1);
                }
                return Z;
              }
            }
            H.BufferLine = X;
          },
          4841: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.getRangeLength = void 0),
              (H.getRangeLength = function (K, P) {
                if (K.start.y > K.end.y)
                  throw Error(
                    `Buffer range end (${K.end.x}, ${K.end.y}) cannot be before start (${K.start.x}, ${K.start.y})`
                  );
                return P * (K.end.y - K.start.y) + (K.end.x - K.start.x + 1);
              });
          },
          4634: (M, H) => {
            function K(P, V, q) {
              if (V === P.length - 1) return P[V].getTrimmedLength();
              let J = !P[V].hasContent(q - 1) && P[V].getWidth(q - 1) === 1,
                N = P[V + 1].getWidth(0) === 2;
              return J && N ? q - 1 : q;
            }
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.getWrappedLineTrimmedLength =
                H.reflowSmallerGetNewLineLengths =
                H.reflowLargerApplyNewLayout =
                H.reflowLargerCreateNewLayout =
                H.reflowLargerGetLinesToRemove =
                  void 0),
              (H.reflowLargerGetLinesToRemove = function (P, V, q, J, N) {
                let X = [];
                for (let G = 0; G < P.length - 1; G++) {
                  let Q = G,
                    W = P.get(++Q);
                  if (!W.isWrapped) continue;
                  let Z = [P.get(G)];
                  for (; Q < P.length && W.isWrapped; )
                    Z.push(W), (W = P.get(++Q));
                  if (J >= G && J < Q) {
                    G += Z.length - 1;
                    continue;
                  }
                  let Y = 0,
                    F = K(Z, Y, V),
                    j = 1,
                    $ = 0;
                  for (; j < Z.length; ) {
                    let U = K(Z, j, V),
                      z = U - $,
                      k = q - F,
                      O = Math.min(z, k);
                    Z[Y].copyCellsFrom(Z[j], $, F, O, !1),
                      (F += O),
                      F === q && (Y++, (F = 0)),
                      ($ += O),
                      $ === U && (j++, ($ = 0)),
                      F === 0 &&
                        Y !== 0 &&
                        Z[Y - 1].getWidth(q - 1) === 2 &&
                        (Z[Y].copyCellsFrom(Z[Y - 1], q - 1, F++, 1, !1),
                        Z[Y - 1].setCell(q - 1, N));
                  }
                  Z[Y].replaceCells(F, q, N);
                  let E = 0;
                  for (
                    let U = Z.length - 1;
                    U > 0 && (U > Y || Z[U].getTrimmedLength() === 0);
                    U--
                  )
                    E++;
                  E > 0 && (X.push(G + Z.length - E), X.push(E)),
                    (G += Z.length - 1);
                }
                return X;
              }),
              (H.reflowLargerCreateNewLayout = function (P, V) {
                let q = [],
                  J = 0,
                  N = V[J],
                  X = 0;
                for (let G = 0; G < P.length; G++)
                  if (N === G) {
                    let Q = V[++J];
                    P.onDeleteEmitter.fire({ index: G - X, amount: Q }),
                      (G += Q - 1),
                      (X += Q),
                      (N = V[++J]);
                  } else q.push(G);
                return { layout: q, countRemoved: X };
              }),
              (H.reflowLargerApplyNewLayout = function (P, V) {
                let q = [];
                for (let J = 0; J < V.length; J++) q.push(P.get(V[J]));
                for (let J = 0; J < q.length; J++) P.set(J, q[J]);
                P.length = V.length;
              }),
              (H.reflowSmallerGetNewLineLengths = function (P, V, q) {
                let J = [],
                  N = P.map((W, Z) => K(P, Z, V)).reduce((W, Z) => W + Z),
                  X = 0,
                  G = 0,
                  Q = 0;
                for (; Q < N; ) {
                  if (N - Q < q) {
                    J.push(N - Q);
                    break;
                  }
                  X += q;
                  let W = K(P, G, V);
                  X > W && ((X -= W), G++);
                  let Z = P[G].getWidth(X - 1) === 2;
                  Z && X--;
                  let Y = Z ? q - 1 : q;
                  J.push(Y), (Q += Y);
                }
                return J;
              }),
              (H.getWrappedLineTrimmedLength = K);
          },
          5295: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.BufferSet = void 0);
            let P = K(8460),
              V = K(844),
              q = K(9092);
            class J extends V.Disposable {
              constructor(N, X) {
                super(),
                  (this._optionsService = N),
                  (this._bufferService = X),
                  (this._onBufferActivate = this.register(
                    new P.EventEmitter()
                  )),
                  (this.onBufferActivate = this._onBufferActivate.event),
                  this.reset(),
                  this.register(
                    this._optionsService.onSpecificOptionChange(
                      "scrollback",
                      () =>
                        this.resize(
                          this._bufferService.cols,
                          this._bufferService.rows
                        )
                    )
                  ),
                  this.register(
                    this._optionsService.onSpecificOptionChange(
                      "tabStopWidth",
                      () => this.setupTabStops()
                    )
                  );
              }
              reset() {
                (this._normal = new q.Buffer(
                  !0,
                  this._optionsService,
                  this._bufferService
                )),
                  this._normal.fillViewportRows(),
                  (this._alt = new q.Buffer(
                    !1,
                    this._optionsService,
                    this._bufferService
                  )),
                  (this._activeBuffer = this._normal),
                  this._onBufferActivate.fire({
                    activeBuffer: this._normal,
                    inactiveBuffer: this._alt,
                  }),
                  this.setupTabStops();
              }
              get alt() {
                return this._alt;
              }
              get active() {
                return this._activeBuffer;
              }
              get normal() {
                return this._normal;
              }
              activateNormalBuffer() {
                this._activeBuffer !== this._normal &&
                  ((this._normal.x = this._alt.x),
                  (this._normal.y = this._alt.y),
                  this._alt.clearAllMarkers(),
                  this._alt.clear(),
                  (this._activeBuffer = this._normal),
                  this._onBufferActivate.fire({
                    activeBuffer: this._normal,
                    inactiveBuffer: this._alt,
                  }));
              }
              activateAltBuffer(N) {
                this._activeBuffer !== this._alt &&
                  (this._alt.fillViewportRows(N),
                  (this._alt.x = this._normal.x),
                  (this._alt.y = this._normal.y),
                  (this._activeBuffer = this._alt),
                  this._onBufferActivate.fire({
                    activeBuffer: this._alt,
                    inactiveBuffer: this._normal,
                  }));
              }
              resize(N, X) {
                this._normal.resize(N, X),
                  this._alt.resize(N, X),
                  this.setupTabStops(N);
              }
              setupTabStops(N) {
                this._normal.setupTabStops(N), this._alt.setupTabStops(N);
              }
            }
            H.BufferSet = J;
          },
          511: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.CellData = void 0);
            let P = K(482),
              V = K(643),
              q = K(3734);
            class J extends q.AttributeData {
              constructor() {
                super(...arguments),
                  (this.content = 0),
                  (this.fg = 0),
                  (this.bg = 0),
                  (this.extended = new q.ExtendedAttrs()),
                  (this.combinedData = "");
              }
              static fromCharData(N) {
                let X = new J();
                return X.setFromCharData(N), X;
              }
              isCombined() {
                return 2097152 & this.content;
              }
              getWidth() {
                return this.content >> 22;
              }
              getChars() {
                return 2097152 & this.content
                  ? this.combinedData
                  : 2097151 & this.content
                    ? (0, P.stringFromCodePoint)(2097151 & this.content)
                    : "";
              }
              getCode() {
                return this.isCombined()
                  ? this.combinedData.charCodeAt(this.combinedData.length - 1)
                  : 2097151 & this.content;
              }
              setFromCharData(N) {
                (this.fg = N[V.CHAR_DATA_ATTR_INDEX]), (this.bg = 0);
                let X = !1;
                if (N[V.CHAR_DATA_CHAR_INDEX].length > 2) X = !0;
                else if (N[V.CHAR_DATA_CHAR_INDEX].length === 2) {
                  let G = N[V.CHAR_DATA_CHAR_INDEX].charCodeAt(0);
                  if (55296 <= G && G <= 56319) {
                    let Q = N[V.CHAR_DATA_CHAR_INDEX].charCodeAt(1);
                    56320 <= Q && Q <= 57343
                      ? (this.content =
                          (1024 * (G - 55296) + Q - 56320 + 65536) |
                          (N[V.CHAR_DATA_WIDTH_INDEX] << 22))
                      : (X = !0);
                  } else X = !0;
                } else
                  this.content =
                    N[V.CHAR_DATA_CHAR_INDEX].charCodeAt(0) |
                    (N[V.CHAR_DATA_WIDTH_INDEX] << 22);
                X &&
                  ((this.combinedData = N[V.CHAR_DATA_CHAR_INDEX]),
                  (this.content =
                    2097152 | (N[V.CHAR_DATA_WIDTH_INDEX] << 22)));
              }
              getAsCharData() {
                return [
                  this.fg,
                  this.getChars(),
                  this.getWidth(),
                  this.getCode(),
                ];
              }
            }
            H.CellData = J;
          },
          643: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.WHITESPACE_CELL_CODE =
                H.WHITESPACE_CELL_WIDTH =
                H.WHITESPACE_CELL_CHAR =
                H.NULL_CELL_CODE =
                H.NULL_CELL_WIDTH =
                H.NULL_CELL_CHAR =
                H.CHAR_DATA_CODE_INDEX =
                H.CHAR_DATA_WIDTH_INDEX =
                H.CHAR_DATA_CHAR_INDEX =
                H.CHAR_DATA_ATTR_INDEX =
                H.DEFAULT_EXT =
                H.DEFAULT_ATTR =
                H.DEFAULT_COLOR =
                  void 0),
              (H.DEFAULT_COLOR = 0),
              (H.DEFAULT_ATTR = 256 | (H.DEFAULT_COLOR << 9)),
              (H.DEFAULT_EXT = 0),
              (H.CHAR_DATA_ATTR_INDEX = 0),
              (H.CHAR_DATA_CHAR_INDEX = 1),
              (H.CHAR_DATA_WIDTH_INDEX = 2),
              (H.CHAR_DATA_CODE_INDEX = 3),
              (H.NULL_CELL_CHAR = ""),
              (H.NULL_CELL_WIDTH = 1),
              (H.NULL_CELL_CODE = 0),
              (H.WHITESPACE_CELL_CHAR = " "),
              (H.WHITESPACE_CELL_WIDTH = 1),
              (H.WHITESPACE_CELL_CODE = 32);
          },
          4863: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.Marker = void 0);
            let P = K(8460),
              V = K(844);
            class q {
              get id() {
                return this._id;
              }
              constructor(J) {
                (this.line = J),
                  (this.isDisposed = !1),
                  (this._disposables = []),
                  (this._id = q._nextId++),
                  (this._onDispose = this.register(new P.EventEmitter())),
                  (this.onDispose = this._onDispose.event);
              }
              dispose() {
                this.isDisposed ||
                  ((this.isDisposed = !0),
                  (this.line = -1),
                  this._onDispose.fire(),
                  (0, V.disposeArray)(this._disposables),
                  (this._disposables.length = 0));
              }
              register(J) {
                return this._disposables.push(J), J;
              }
            }
            (H.Marker = q), (q._nextId = 1);
          },
          7116: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.DEFAULT_CHARSET = H.CHARSETS = void 0),
              (H.CHARSETS = {}),
              (H.DEFAULT_CHARSET = H.CHARSETS.B),
              (H.CHARSETS[0] = {
                "`": "◆",
                a: "▒",
                b: "␉",
                c: "␌",
                d: "␍",
                e: "␊",
                f: "°",
                g: "±",
                h: "␤",
                i: "␋",
                j: "┘",
                k: "┐",
                l: "┌",
                m: "└",
                n: "┼",
                o: "⎺",
                p: "⎻",
                q: "─",
                r: "⎼",
                s: "⎽",
                t: "├",
                u: "┤",
                v: "┴",
                w: "┬",
                x: "│",
                y: "≤",
                z: "≥",
                "{": "π",
                "|": "≠",
                "}": "£",
                "~": "·",
              }),
              (H.CHARSETS.A = { "#": "£" }),
              (H.CHARSETS.B = void 0),
              (H.CHARSETS[4] = {
                "#": "£",
                "@": "¾",
                "[": "ij",
                "\\": "½",
                "]": "|",
                "{": "¨",
                "|": "f",
                "}": "¼",
                "~": "´",
              }),
              (H.CHARSETS.C = H.CHARSETS[5] =
                {
                  "[": "Ä",
                  "\\": "Ö",
                  "]": "Å",
                  "^": "Ü",
                  "`": "é",
                  "{": "ä",
                  "|": "ö",
                  "}": "å",
                  "~": "ü",
                }),
              (H.CHARSETS.R = {
                "#": "£",
                "@": "à",
                "[": "°",
                "\\": "ç",
                "]": "§",
                "{": "é",
                "|": "ù",
                "}": "è",
                "~": "¨",
              }),
              (H.CHARSETS.Q = {
                "@": "à",
                "[": "â",
                "\\": "ç",
                "]": "ê",
                "^": "î",
                "`": "ô",
                "{": "é",
                "|": "ù",
                "}": "è",
                "~": "û",
              }),
              (H.CHARSETS.K = {
                "@": "§",
                "[": "Ä",
                "\\": "Ö",
                "]": "Ü",
                "{": "ä",
                "|": "ö",
                "}": "ü",
                "~": "ß",
              }),
              (H.CHARSETS.Y = {
                "#": "£",
                "@": "§",
                "[": "°",
                "\\": "ç",
                "]": "é",
                "`": "ù",
                "{": "à",
                "|": "ò",
                "}": "è",
                "~": "ì",
              }),
              (H.CHARSETS.E = H.CHARSETS[6] =
                {
                  "@": "Ä",
                  "[": "Æ",
                  "\\": "Ø",
                  "]": "Å",
                  "^": "Ü",
                  "`": "ä",
                  "{": "æ",
                  "|": "ø",
                  "}": "å",
                  "~": "ü",
                }),
              (H.CHARSETS.Z = {
                "#": "£",
                "@": "§",
                "[": "¡",
                "\\": "Ñ",
                "]": "¿",
                "{": "°",
                "|": "ñ",
                "}": "ç",
              }),
              (H.CHARSETS.H = H.CHARSETS[7] =
                {
                  "@": "É",
                  "[": "Ä",
                  "\\": "Ö",
                  "]": "Å",
                  "^": "Ü",
                  "`": "é",
                  "{": "ä",
                  "|": "ö",
                  "}": "å",
                  "~": "ü",
                }),
              (H.CHARSETS["="] = {
                "#": "ù",
                "@": "à",
                "[": "é",
                "\\": "ç",
                "]": "ê",
                "^": "î",
                _: "è",
                "`": "ô",
                "{": "ä",
                "|": "ö",
                "}": "ü",
                "~": "û",
              });
          },
          2584: (M, H) => {
            var K, P, V;
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.C1_ESCAPED = H.C1 = H.C0 = void 0),
              (function (q) {
                (q.NUL = "\x00"),
                  (q.SOH = "\x01"),
                  (q.STX = "\x02"),
                  (q.ETX = "\x03"),
                  (q.EOT = "\x04"),
                  (q.ENQ = "\x05"),
                  (q.ACK = "\x06"),
                  (q.BEL = "\x07"),
                  (q.BS = "\b"),
                  (q.HT = "\t"),
                  (q.LF = `
`),
                  (q.VT = "\v"),
                  (q.FF = "\f"),
                  (q.CR = "\r"),
                  (q.SO = "\x0E"),
                  (q.SI = "\x0F"),
                  (q.DLE = "\x10"),
                  (q.DC1 = "\x11"),
                  (q.DC2 = "\x12"),
                  (q.DC3 = "\x13"),
                  (q.DC4 = "\x14"),
                  (q.NAK = "\x15"),
                  (q.SYN = "\x16"),
                  (q.ETB = "\x17"),
                  (q.CAN = "\x18"),
                  (q.EM = "\x19"),
                  (q.SUB = "\x1A"),
                  (q.ESC = "\x1B"),
                  (q.FS = "\x1C"),
                  (q.GS = "\x1D"),
                  (q.RS = "\x1E"),
                  (q.US = "\x1F"),
                  (q.SP = " "),
                  (q.DEL = "");
              })(K || (H.C0 = K = {})),
              (function (q) {
                (q.PAD = ""),
                  (q.HOP = ""),
                  (q.BPH = ""),
                  (q.NBH = ""),
                  (q.IND = ""),
                  (q.NEL = ""),
                  (q.SSA = ""),
                  (q.ESA = ""),
                  (q.HTS = ""),
                  (q.HTJ = ""),
                  (q.VTS = ""),
                  (q.PLD = ""),
                  (q.PLU = ""),
                  (q.RI = ""),
                  (q.SS2 = ""),
                  (q.SS3 = ""),
                  (q.DCS = ""),
                  (q.PU1 = ""),
                  (q.PU2 = ""),
                  (q.STS = ""),
                  (q.CCH = ""),
                  (q.MW = ""),
                  (q.SPA = ""),
                  (q.EPA = ""),
                  (q.SOS = ""),
                  (q.SGCI = ""),
                  (q.SCI = ""),
                  (q.CSI = ""),
                  (q.ST = ""),
                  (q.OSC = ""),
                  (q.PM = ""),
                  (q.APC = "");
              })(P || (H.C1 = P = {})),
              (function (q) {
                q.ST = `${K.ESC}\\`;
              })(V || (H.C1_ESCAPED = V = {}));
          },
          7399: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.evaluateKeyboardEvent = void 0);
            let P = K(2584),
              V = {
                48: ["0", ")"],
                49: ["1", "!"],
                50: ["2", "@"],
                51: ["3", "#"],
                52: ["4", "$"],
                53: ["5", "%"],
                54: ["6", "^"],
                55: ["7", "&"],
                56: ["8", "*"],
                57: ["9", "("],
                186: [";", ":"],
                187: ["=", "+"],
                188: [",", "<"],
                189: ["-", "_"],
                190: [".", ">"],
                191: ["/", "?"],
                192: ["`", "~"],
                219: ["[", "{"],
                220: ["\\", "|"],
                221: ["]", "}"],
                222: ["'", '"'],
              };
            H.evaluateKeyboardEvent = function (q, J, N, X) {
              let G = { type: 0, cancel: !1, key: void 0 },
                Q =
                  (q.shiftKey ? 1 : 0) |
                  (q.altKey ? 2 : 0) |
                  (q.ctrlKey ? 4 : 0) |
                  (q.metaKey ? 8 : 0);
              switch (q.keyCode) {
                case 0:
                  q.key === "UIKeyInputUpArrow"
                    ? (G.key = J ? P.C0.ESC + "OA" : P.C0.ESC + "[A")
                    : q.key === "UIKeyInputLeftArrow"
                      ? (G.key = J ? P.C0.ESC + "OD" : P.C0.ESC + "[D")
                      : q.key === "UIKeyInputRightArrow"
                        ? (G.key = J ? P.C0.ESC + "OC" : P.C0.ESC + "[C")
                        : q.key === "UIKeyInputDownArrow" &&
                          (G.key = J ? P.C0.ESC + "OB" : P.C0.ESC + "[B");
                  break;
                case 8:
                  if (q.altKey) {
                    G.key = P.C0.ESC + P.C0.DEL;
                    break;
                  }
                  G.key = P.C0.DEL;
                  break;
                case 9:
                  if (q.shiftKey) {
                    G.key = P.C0.ESC + "[Z";
                    break;
                  }
                  (G.key = P.C0.HT), (G.cancel = !0);
                  break;
                case 13:
                  (G.key = q.altKey ? P.C0.ESC + P.C0.CR : P.C0.CR),
                    (G.cancel = !0);
                  break;
                case 27:
                  (G.key = P.C0.ESC),
                    q.altKey && (G.key = P.C0.ESC + P.C0.ESC),
                    (G.cancel = !0);
                  break;
                case 37:
                  if (q.metaKey) break;
                  Q
                    ? ((G.key = P.C0.ESC + "[1;" + (Q + 1) + "D"),
                      G.key === P.C0.ESC + "[1;3D" &&
                        (G.key = P.C0.ESC + (N ? "b" : "[1;5D")))
                    : (G.key = J ? P.C0.ESC + "OD" : P.C0.ESC + "[D");
                  break;
                case 39:
                  if (q.metaKey) break;
                  Q
                    ? ((G.key = P.C0.ESC + "[1;" + (Q + 1) + "C"),
                      G.key === P.C0.ESC + "[1;3C" &&
                        (G.key = P.C0.ESC + (N ? "f" : "[1;5C")))
                    : (G.key = J ? P.C0.ESC + "OC" : P.C0.ESC + "[C");
                  break;
                case 38:
                  if (q.metaKey) break;
                  Q
                    ? ((G.key = P.C0.ESC + "[1;" + (Q + 1) + "A"),
                      N ||
                        G.key !== P.C0.ESC + "[1;3A" ||
                        (G.key = P.C0.ESC + "[1;5A"))
                    : (G.key = J ? P.C0.ESC + "OA" : P.C0.ESC + "[A");
                  break;
                case 40:
                  if (q.metaKey) break;
                  Q
                    ? ((G.key = P.C0.ESC + "[1;" + (Q + 1) + "B"),
                      N ||
                        G.key !== P.C0.ESC + "[1;3B" ||
                        (G.key = P.C0.ESC + "[1;5B"))
                    : (G.key = J ? P.C0.ESC + "OB" : P.C0.ESC + "[B");
                  break;
                case 45:
                  q.shiftKey || q.ctrlKey || (G.key = P.C0.ESC + "[2~");
                  break;
                case 46:
                  G.key = Q
                    ? P.C0.ESC + "[3;" + (Q + 1) + "~"
                    : P.C0.ESC + "[3~";
                  break;
                case 36:
                  G.key = Q
                    ? P.C0.ESC + "[1;" + (Q + 1) + "H"
                    : J
                      ? P.C0.ESC + "OH"
                      : P.C0.ESC + "[H";
                  break;
                case 35:
                  G.key = Q
                    ? P.C0.ESC + "[1;" + (Q + 1) + "F"
                    : J
                      ? P.C0.ESC + "OF"
                      : P.C0.ESC + "[F";
                  break;
                case 33:
                  q.shiftKey
                    ? (G.type = 2)
                    : q.ctrlKey
                      ? (G.key = P.C0.ESC + "[5;" + (Q + 1) + "~")
                      : (G.key = P.C0.ESC + "[5~");
                  break;
                case 34:
                  q.shiftKey
                    ? (G.type = 3)
                    : q.ctrlKey
                      ? (G.key = P.C0.ESC + "[6;" + (Q + 1) + "~")
                      : (G.key = P.C0.ESC + "[6~");
                  break;
                case 112:
                  G.key = Q
                    ? P.C0.ESC + "[1;" + (Q + 1) + "P"
                    : P.C0.ESC + "OP";
                  break;
                case 113:
                  G.key = Q
                    ? P.C0.ESC + "[1;" + (Q + 1) + "Q"
                    : P.C0.ESC + "OQ";
                  break;
                case 114:
                  G.key = Q
                    ? P.C0.ESC + "[1;" + (Q + 1) + "R"
                    : P.C0.ESC + "OR";
                  break;
                case 115:
                  G.key = Q
                    ? P.C0.ESC + "[1;" + (Q + 1) + "S"
                    : P.C0.ESC + "OS";
                  break;
                case 116:
                  G.key = Q
                    ? P.C0.ESC + "[15;" + (Q + 1) + "~"
                    : P.C0.ESC + "[15~";
                  break;
                case 117:
                  G.key = Q
                    ? P.C0.ESC + "[17;" + (Q + 1) + "~"
                    : P.C0.ESC + "[17~";
                  break;
                case 118:
                  G.key = Q
                    ? P.C0.ESC + "[18;" + (Q + 1) + "~"
                    : P.C0.ESC + "[18~";
                  break;
                case 119:
                  G.key = Q
                    ? P.C0.ESC + "[19;" + (Q + 1) + "~"
                    : P.C0.ESC + "[19~";
                  break;
                case 120:
                  G.key = Q
                    ? P.C0.ESC + "[20;" + (Q + 1) + "~"
                    : P.C0.ESC + "[20~";
                  break;
                case 121:
                  G.key = Q
                    ? P.C0.ESC + "[21;" + (Q + 1) + "~"
                    : P.C0.ESC + "[21~";
                  break;
                case 122:
                  G.key = Q
                    ? P.C0.ESC + "[23;" + (Q + 1) + "~"
                    : P.C0.ESC + "[23~";
                  break;
                case 123:
                  G.key = Q
                    ? P.C0.ESC + "[24;" + (Q + 1) + "~"
                    : P.C0.ESC + "[24~";
                  break;
                default:
                  if (!q.ctrlKey || q.shiftKey || q.altKey || q.metaKey)
                    if ((N && !X) || !q.altKey || q.metaKey)
                      !N || q.altKey || q.ctrlKey || q.shiftKey || !q.metaKey
                        ? q.key &&
                          !q.ctrlKey &&
                          !q.altKey &&
                          !q.metaKey &&
                          q.keyCode >= 48 &&
                          q.key.length === 1
                          ? (G.key = q.key)
                          : q.key &&
                            q.ctrlKey &&
                            (q.key === "_" && (G.key = P.C0.US),
                            q.key === "@" && (G.key = P.C0.NUL))
                        : q.keyCode === 65 && (G.type = 1);
                    else {
                      let W = V[q.keyCode],
                        Z = W == null ? void 0 : W[q.shiftKey ? 1 : 0];
                      if (Z) G.key = P.C0.ESC + Z;
                      else if (q.keyCode >= 65 && q.keyCode <= 90) {
                        let Y = q.ctrlKey ? q.keyCode - 64 : q.keyCode + 32,
                          F = String.fromCharCode(Y);
                        q.shiftKey && (F = F.toUpperCase()),
                          (G.key = P.C0.ESC + F);
                      } else if (q.keyCode === 32)
                        G.key = P.C0.ESC + (q.ctrlKey ? P.C0.NUL : " ");
                      else if (q.key === "Dead" && q.code.startsWith("Key")) {
                        let Y = q.code.slice(3, 4);
                        q.shiftKey || (Y = Y.toLowerCase()),
                          (G.key = P.C0.ESC + Y),
                          (G.cancel = !0);
                      }
                    }
                  else
                    q.keyCode >= 65 && q.keyCode <= 90
                      ? (G.key = String.fromCharCode(q.keyCode - 64))
                      : q.keyCode === 32
                        ? (G.key = P.C0.NUL)
                        : q.keyCode >= 51 && q.keyCode <= 55
                          ? (G.key = String.fromCharCode(q.keyCode - 51 + 27))
                          : q.keyCode === 56
                            ? (G.key = P.C0.DEL)
                            : q.keyCode === 219
                              ? (G.key = P.C0.ESC)
                              : q.keyCode === 220
                                ? (G.key = P.C0.FS)
                                : q.keyCode === 221 && (G.key = P.C0.GS);
              }
              return G;
            };
          },
          482: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.Utf8ToUtf32 =
                H.StringToUtf32 =
                H.utf32ToString =
                H.stringFromCodePoint =
                  void 0),
              (H.stringFromCodePoint = function (K) {
                return K > 65535
                  ? ((K -= 65536),
                    String.fromCharCode(55296 + (K >> 10)) +
                      String.fromCharCode((K % 1024) + 56320))
                  : String.fromCharCode(K);
              }),
              (H.utf32ToString = function (K, P = 0, V = K.length) {
                let q = "";
                for (let J = P; J < V; ++J) {
                  let N = K[J];
                  N > 65535
                    ? ((N -= 65536),
                      (q +=
                        String.fromCharCode(55296 + (N >> 10)) +
                        String.fromCharCode((N % 1024) + 56320)))
                    : (q += String.fromCharCode(N));
                }
                return q;
              }),
              (H.StringToUtf32 = class {
                constructor() {
                  this._interim = 0;
                }
                clear() {
                  this._interim = 0;
                }
                decode(K, P) {
                  let V = K.length;
                  if (!V) return 0;
                  let q = 0,
                    J = 0;
                  if (this._interim) {
                    let N = K.charCodeAt(J++);
                    56320 <= N && N <= 57343
                      ? (P[q++] =
                          1024 * (this._interim - 55296) + N - 56320 + 65536)
                      : ((P[q++] = this._interim), (P[q++] = N)),
                      (this._interim = 0);
                  }
                  for (let N = J; N < V; ++N) {
                    let X = K.charCodeAt(N);
                    if (55296 <= X && X <= 56319) {
                      if (++N >= V) return (this._interim = X), q;
                      let G = K.charCodeAt(N);
                      56320 <= G && G <= 57343
                        ? (P[q++] = 1024 * (X - 55296) + G - 56320 + 65536)
                        : ((P[q++] = X), (P[q++] = G));
                    } else X !== 65279 && (P[q++] = X);
                  }
                  return q;
                }
              }),
              (H.Utf8ToUtf32 = class {
                constructor() {
                  this.interim = new Uint8Array(3);
                }
                clear() {
                  this.interim.fill(0);
                }
                decode(K, P) {
                  let V = K.length;
                  if (!V) return 0;
                  let q,
                    J,
                    N,
                    X,
                    G = 0,
                    Q = 0,
                    W = 0;
                  if (this.interim[0]) {
                    let F = !1,
                      j = this.interim[0];
                    j &= (224 & j) == 192 ? 31 : (240 & j) == 224 ? 15 : 7;
                    let $,
                      E = 0;
                    for (; ($ = 63 & this.interim[++E]) && E < 4; )
                      (j <<= 6), (j |= $);
                    let U =
                        (224 & this.interim[0]) == 192
                          ? 2
                          : (240 & this.interim[0]) == 224
                            ? 3
                            : 4,
                      z = U - E;
                    for (; W < z; ) {
                      if (W >= V) return 0;
                      if ((($ = K[W++]), (192 & $) != 128)) {
                        W--, (F = !0);
                        break;
                      }
                      (this.interim[E++] = $), (j <<= 6), (j |= 63 & $);
                    }
                    F ||
                      (U === 2
                        ? j < 128
                          ? W--
                          : (P[G++] = j)
                        : U === 3
                          ? j < 2048 ||
                            (j >= 55296 && j <= 57343) ||
                            j === 65279 ||
                            (P[G++] = j)
                          : j < 65536 || j > 1114111 || (P[G++] = j)),
                      this.interim.fill(0);
                  }
                  let Z = V - 4,
                    Y = W;
                  for (; Y < V; ) {
                    for (
                      ;
                      !(
                        !(Y < Z) ||
                        128 & (q = K[Y]) ||
                        128 & (J = K[Y + 1]) ||
                        128 & (N = K[Y + 2]) ||
                        128 & (X = K[Y + 3])
                      );
                    )
                      (P[G++] = q),
                        (P[G++] = J),
                        (P[G++] = N),
                        (P[G++] = X),
                        (Y += 4);
                    if (((q = K[Y++]), q < 128)) P[G++] = q;
                    else if ((224 & q) == 192) {
                      if (Y >= V) return (this.interim[0] = q), G;
                      if (((J = K[Y++]), (192 & J) != 128)) {
                        Y--;
                        continue;
                      }
                      if (((Q = ((31 & q) << 6) | (63 & J)), Q < 128)) {
                        Y--;
                        continue;
                      }
                      P[G++] = Q;
                    } else if ((240 & q) == 224) {
                      if (Y >= V) return (this.interim[0] = q), G;
                      if (((J = K[Y++]), (192 & J) != 128)) {
                        Y--;
                        continue;
                      }
                      if (Y >= V)
                        return (this.interim[0] = q), (this.interim[1] = J), G;
                      if (((N = K[Y++]), (192 & N) != 128)) {
                        Y--;
                        continue;
                      }
                      if (
                        ((Q = ((15 & q) << 12) | ((63 & J) << 6) | (63 & N)),
                        Q < 2048 || (Q >= 55296 && Q <= 57343) || Q === 65279)
                      )
                        continue;
                      P[G++] = Q;
                    } else if ((248 & q) == 240) {
                      if (Y >= V) return (this.interim[0] = q), G;
                      if (((J = K[Y++]), (192 & J) != 128)) {
                        Y--;
                        continue;
                      }
                      if (Y >= V)
                        return (this.interim[0] = q), (this.interim[1] = J), G;
                      if (((N = K[Y++]), (192 & N) != 128)) {
                        Y--;
                        continue;
                      }
                      if (Y >= V)
                        return (
                          (this.interim[0] = q),
                          (this.interim[1] = J),
                          (this.interim[2] = N),
                          G
                        );
                      if (((X = K[Y++]), (192 & X) != 128)) {
                        Y--;
                        continue;
                      }
                      if (
                        ((Q =
                          ((7 & q) << 18) |
                          ((63 & J) << 12) |
                          ((63 & N) << 6) |
                          (63 & X)),
                        Q < 65536 || Q > 1114111)
                      )
                        continue;
                      P[G++] = Q;
                    }
                  }
                  return G;
                }
              });
          },
          225: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.UnicodeV6 = void 0);
            let K = [
                [768, 879],
                [1155, 1158],
                [1160, 1161],
                [1425, 1469],
                [1471, 1471],
                [1473, 1474],
                [1476, 1477],
                [1479, 1479],
                [1536, 1539],
                [1552, 1557],
                [1611, 1630],
                [1648, 1648],
                [1750, 1764],
                [1767, 1768],
                [1770, 1773],
                [1807, 1807],
                [1809, 1809],
                [1840, 1866],
                [1958, 1968],
                [2027, 2035],
                [2305, 2306],
                [2364, 2364],
                [2369, 2376],
                [2381, 2381],
                [2385, 2388],
                [2402, 2403],
                [2433, 2433],
                [2492, 2492],
                [2497, 2500],
                [2509, 2509],
                [2530, 2531],
                [2561, 2562],
                [2620, 2620],
                [2625, 2626],
                [2631, 2632],
                [2635, 2637],
                [2672, 2673],
                [2689, 2690],
                [2748, 2748],
                [2753, 2757],
                [2759, 2760],
                [2765, 2765],
                [2786, 2787],
                [2817, 2817],
                [2876, 2876],
                [2879, 2879],
                [2881, 2883],
                [2893, 2893],
                [2902, 2902],
                [2946, 2946],
                [3008, 3008],
                [3021, 3021],
                [3134, 3136],
                [3142, 3144],
                [3146, 3149],
                [3157, 3158],
                [3260, 3260],
                [3263, 3263],
                [3270, 3270],
                [3276, 3277],
                [3298, 3299],
                [3393, 3395],
                [3405, 3405],
                [3530, 3530],
                [3538, 3540],
                [3542, 3542],
                [3633, 3633],
                [3636, 3642],
                [3655, 3662],
                [3761, 3761],
                [3764, 3769],
                [3771, 3772],
                [3784, 3789],
                [3864, 3865],
                [3893, 3893],
                [3895, 3895],
                [3897, 3897],
                [3953, 3966],
                [3968, 3972],
                [3974, 3975],
                [3984, 3991],
                [3993, 4028],
                [4038, 4038],
                [4141, 4144],
                [4146, 4146],
                [4150, 4151],
                [4153, 4153],
                [4184, 4185],
                [4448, 4607],
                [4959, 4959],
                [5906, 5908],
                [5938, 5940],
                [5970, 5971],
                [6002, 6003],
                [6068, 6069],
                [6071, 6077],
                [6086, 6086],
                [6089, 6099],
                [6109, 6109],
                [6155, 6157],
                [6313, 6313],
                [6432, 6434],
                [6439, 6440],
                [6450, 6450],
                [6457, 6459],
                [6679, 6680],
                [6912, 6915],
                [6964, 6964],
                [6966, 6970],
                [6972, 6972],
                [6978, 6978],
                [7019, 7027],
                [7616, 7626],
                [7678, 7679],
                [8203, 8207],
                [8234, 8238],
                [8288, 8291],
                [8298, 8303],
                [8400, 8431],
                [12330, 12335],
                [12441, 12442],
                [43014, 43014],
                [43019, 43019],
                [43045, 43046],
                [64286, 64286],
                [65024, 65039],
                [65056, 65059],
                [65279, 65279],
                [65529, 65531],
              ],
              P = [
                [68097, 68099],
                [68101, 68102],
                [68108, 68111],
                [68152, 68154],
                [68159, 68159],
                [119143, 119145],
                [119155, 119170],
                [119173, 119179],
                [119210, 119213],
                [119362, 119364],
                [917505, 917505],
                [917536, 917631],
                [917760, 917999],
              ],
              V;
            H.UnicodeV6 = class {
              constructor() {
                if (((this.version = "6"), !V)) {
                  (V = new Uint8Array(65536)),
                    V.fill(1),
                    (V[0] = 0),
                    V.fill(0, 1, 32),
                    V.fill(0, 127, 160),
                    V.fill(2, 4352, 4448),
                    (V[9001] = 2),
                    (V[9002] = 2),
                    V.fill(2, 11904, 42192),
                    (V[12351] = 1),
                    V.fill(2, 44032, 55204),
                    V.fill(2, 63744, 64256),
                    V.fill(2, 65040, 65050),
                    V.fill(2, 65072, 65136),
                    V.fill(2, 65280, 65377),
                    V.fill(2, 65504, 65511);
                  for (let q = 0; q < K.length; ++q)
                    V.fill(0, K[q][0], K[q][1] + 1);
                }
              }
              wcwidth(q) {
                return q < 32
                  ? 0
                  : q < 127
                    ? 1
                    : q < 65536
                      ? V[q]
                      : (function (J, N) {
                            let X,
                              G = 0,
                              Q = N.length - 1;
                            if (J < N[0][0] || J > N[Q][1]) return !1;
                            for (; Q >= G; )
                              if (((X = (G + Q) >> 1), J > N[X][1])) G = X + 1;
                              else {
                                if (!(J < N[X][0])) return !0;
                                Q = X - 1;
                              }
                            return !1;
                          })(q, P)
                        ? 0
                        : (q >= 131072 && q <= 196605) ||
                            (q >= 196608 && q <= 262141)
                          ? 2
                          : 1;
              }
            };
          },
          5981: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.WriteBuffer = void 0);
            let P = K(8460),
              V = K(844);
            class q extends V.Disposable {
              constructor(J) {
                super(),
                  (this._action = J),
                  (this._writeBuffer = []),
                  (this._callbacks = []),
                  (this._pendingData = 0),
                  (this._bufferOffset = 0),
                  (this._isSyncWriting = !1),
                  (this._syncCalls = 0),
                  (this._didUserInput = !1),
                  (this._onWriteParsed = this.register(new P.EventEmitter())),
                  (this.onWriteParsed = this._onWriteParsed.event);
              }
              handleUserInput() {
                this._didUserInput = !0;
              }
              writeSync(J, N) {
                if (N !== void 0 && this._syncCalls > N)
                  return void (this._syncCalls = 0);
                if (
                  ((this._pendingData += J.length),
                  this._writeBuffer.push(J),
                  this._callbacks.push(void 0),
                  this._syncCalls++,
                  this._isSyncWriting)
                )
                  return;
                let X;
                for (
                  this._isSyncWriting = !0;
                  (X = this._writeBuffer.shift());
                ) {
                  this._action(X);
                  let G = this._callbacks.shift();
                  G && G();
                }
                (this._pendingData = 0),
                  (this._bufferOffset = 2147483647),
                  (this._isSyncWriting = !1),
                  (this._syncCalls = 0);
              }
              write(J, N) {
                if (this._pendingData > 50000000)
                  throw Error(
                    "write data discarded, use flow control to avoid losing data"
                  );
                if (!this._writeBuffer.length) {
                  if (((this._bufferOffset = 0), this._didUserInput))
                    return (
                      (this._didUserInput = !1),
                      (this._pendingData += J.length),
                      this._writeBuffer.push(J),
                      this._callbacks.push(N),
                      void this._innerWrite()
                    );
                  setTimeout(() => this._innerWrite());
                }
                (this._pendingData += J.length),
                  this._writeBuffer.push(J),
                  this._callbacks.push(N);
              }
              _innerWrite(J = 0, N = !0) {
                let X = J || Date.now();
                for (; this._writeBuffer.length > this._bufferOffset; ) {
                  let G = this._writeBuffer[this._bufferOffset],
                    Q = this._action(G, N);
                  if (Q) {
                    let Z = (Y) =>
                      Date.now() - X >= 12
                        ? setTimeout(() => this._innerWrite(0, Y))
                        : this._innerWrite(X, Y);
                    return void Q.catch(
                      (Y) => (
                        queueMicrotask(() => {
                          throw Y;
                        }),
                        Promise.resolve(!1)
                      )
                    ).then(Z);
                  }
                  let W = this._callbacks[this._bufferOffset];
                  if (
                    (W && W(),
                    this._bufferOffset++,
                    (this._pendingData -= G.length),
                    Date.now() - X >= 12)
                  )
                    break;
                }
                this._writeBuffer.length > this._bufferOffset
                  ? (this._bufferOffset > 50 &&
                      ((this._writeBuffer = this._writeBuffer.slice(
                        this._bufferOffset
                      )),
                      (this._callbacks = this._callbacks.slice(
                        this._bufferOffset
                      )),
                      (this._bufferOffset = 0)),
                    setTimeout(() => this._innerWrite()))
                  : ((this._writeBuffer.length = 0),
                    (this._callbacks.length = 0),
                    (this._pendingData = 0),
                    (this._bufferOffset = 0)),
                  this._onWriteParsed.fire();
              }
            }
            H.WriteBuffer = q;
          },
          5941: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.toRgbString = H.parseColor = void 0);
            let K =
                /^([\da-f])\/([\da-f])\/([\da-f])$|^([\da-f]{2})\/([\da-f]{2})\/([\da-f]{2})$|^([\da-f]{3})\/([\da-f]{3})\/([\da-f]{3})$|^([\da-f]{4})\/([\da-f]{4})\/([\da-f]{4})$/,
              P = /^[\da-f]+$/;
            function V(q, J) {
              let N = q.toString(16),
                X = N.length < 2 ? "0" + N : N;
              switch (J) {
                case 4:
                  return N[0];
                case 8:
                  return X;
                case 12:
                  return (X + X).slice(0, 3);
                default:
                  return X + X;
              }
            }
            (H.parseColor = function (q) {
              if (!q) return;
              let J = q.toLowerCase();
              if (J.indexOf("rgb:") === 0) {
                J = J.slice(4);
                let N = K.exec(J);
                if (N) {
                  let X = N[1] ? 15 : N[4] ? 255 : N[7] ? 4095 : 65535;
                  return [
                    Math.round(
                      (parseInt(N[1] || N[4] || N[7] || N[10], 16) / X) * 255
                    ),
                    Math.round(
                      (parseInt(N[2] || N[5] || N[8] || N[11], 16) / X) * 255
                    ),
                    Math.round(
                      (parseInt(N[3] || N[6] || N[9] || N[12], 16) / X) * 255
                    ),
                  ];
                }
              } else if (
                J.indexOf("#") === 0 &&
                ((J = J.slice(1)),
                P.exec(J) && [3, 6, 9, 12].includes(J.length))
              ) {
                let N = J.length / 3,
                  X = [0, 0, 0];
                for (let G = 0; G < 3; ++G) {
                  let Q = parseInt(J.slice(N * G, N * G + N), 16);
                  X[G] =
                    N === 1 ? Q << 4 : N === 2 ? Q : N === 3 ? Q >> 4 : Q >> 8;
                }
                return X;
              }
            }),
              (H.toRgbString = function (q, J = 16) {
                let [N, X, G] = q;
                return `rgb:${V(N, J)}/${V(X, J)}/${V(G, J)}`;
              });
          },
          5770: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.PAYLOAD_LIMIT = void 0),
              (H.PAYLOAD_LIMIT = 1e7);
          },
          6351: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.DcsHandler = H.DcsParser = void 0);
            let P = K(482),
              V = K(8742),
              q = K(5770),
              J = [];
            H.DcsParser = class {
              constructor() {
                (this._handlers = Object.create(null)),
                  (this._active = J),
                  (this._ident = 0),
                  (this._handlerFb = () => {}),
                  (this._stack = {
                    paused: !1,
                    loopPosition: 0,
                    fallThrough: !1,
                  });
              }
              dispose() {
                (this._handlers = Object.create(null)),
                  (this._handlerFb = () => {}),
                  (this._active = J);
              }
              registerHandler(X, G) {
                this._handlers[X] === void 0 && (this._handlers[X] = []);
                let Q = this._handlers[X];
                return (
                  Q.push(G),
                  {
                    dispose: () => {
                      let W = Q.indexOf(G);
                      W !== -1 && Q.splice(W, 1);
                    },
                  }
                );
              }
              clearHandler(X) {
                this._handlers[X] && delete this._handlers[X];
              }
              setHandlerFallback(X) {
                this._handlerFb = X;
              }
              reset() {
                if (this._active.length)
                  for (
                    let X = this._stack.paused
                      ? this._stack.loopPosition - 1
                      : this._active.length - 1;
                    X >= 0;
                    --X
                  )
                    this._active[X].unhook(!1);
                (this._stack.paused = !1),
                  (this._active = J),
                  (this._ident = 0);
              }
              hook(X, G) {
                if (
                  (this.reset(),
                  (this._ident = X),
                  (this._active = this._handlers[X] || J),
                  this._active.length)
                )
                  for (let Q = this._active.length - 1; Q >= 0; Q--)
                    this._active[Q].hook(G);
                else this._handlerFb(this._ident, "HOOK", G);
              }
              put(X, G, Q) {
                if (this._active.length)
                  for (let W = this._active.length - 1; W >= 0; W--)
                    this._active[W].put(X, G, Q);
                else
                  this._handlerFb(
                    this._ident,
                    "PUT",
                    (0, P.utf32ToString)(X, G, Q)
                  );
              }
              unhook(X, G = !0) {
                if (this._active.length) {
                  let Q = !1,
                    W = this._active.length - 1,
                    Z = !1;
                  if (
                    (this._stack.paused &&
                      ((W = this._stack.loopPosition - 1),
                      (Q = G),
                      (Z = this._stack.fallThrough),
                      (this._stack.paused = !1)),
                    !Z && Q === !1)
                  ) {
                    for (
                      ;
                      W >= 0 && ((Q = this._active[W].unhook(X)), Q !== !0);
                      W--
                    )
                      if (Q instanceof Promise)
                        return (
                          (this._stack.paused = !0),
                          (this._stack.loopPosition = W),
                          (this._stack.fallThrough = !1),
                          Q
                        );
                    W--;
                  }
                  for (; W >= 0; W--)
                    if (
                      ((Q = this._active[W].unhook(!1)), Q instanceof Promise)
                    )
                      return (
                        (this._stack.paused = !0),
                        (this._stack.loopPosition = W),
                        (this._stack.fallThrough = !0),
                        Q
                      );
                } else this._handlerFb(this._ident, "UNHOOK", X);
                (this._active = J), (this._ident = 0);
              }
            };
            let N = new V.Params();
            N.addParam(0),
              (H.DcsHandler = class {
                constructor(X) {
                  (this._handler = X),
                    (this._data = ""),
                    (this._params = N),
                    (this._hitLimit = !1);
                }
                hook(X) {
                  (this._params = X.length > 1 || X.params[0] ? X.clone() : N),
                    (this._data = ""),
                    (this._hitLimit = !1);
                }
                put(X, G, Q) {
                  this._hitLimit ||
                    ((this._data += (0, P.utf32ToString)(X, G, Q)),
                    this._data.length > q.PAYLOAD_LIMIT &&
                      ((this._data = ""), (this._hitLimit = !0)));
                }
                unhook(X) {
                  let G = !1;
                  if (this._hitLimit) G = !1;
                  else if (
                    X &&
                    ((G = this._handler(this._data, this._params)),
                    G instanceof Promise)
                  )
                    return G.then(
                      (Q) => (
                        (this._params = N),
                        (this._data = ""),
                        (this._hitLimit = !1),
                        Q
                      )
                    );
                  return (
                    (this._params = N),
                    (this._data = ""),
                    (this._hitLimit = !1),
                    G
                  );
                }
              });
          },
          2015: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.EscapeSequenceParser =
                H.VT500_TRANSITION_TABLE =
                H.TransitionTable =
                  void 0);
            let P = K(844),
              V = K(8742),
              q = K(6242),
              J = K(6351);
            class N {
              constructor(Q) {
                this.table = new Uint8Array(Q);
              }
              setDefault(Q, W) {
                this.table.fill((Q << 4) | W);
              }
              add(Q, W, Z, Y) {
                this.table[(W << 8) | Q] = (Z << 4) | Y;
              }
              addMany(Q, W, Z, Y) {
                for (let F = 0; F < Q.length; F++)
                  this.table[(W << 8) | Q[F]] = (Z << 4) | Y;
              }
            }
            H.TransitionTable = N;
            let X = 160;
            H.VT500_TRANSITION_TABLE = (function () {
              let Q = new N(4095),
                W = Array.apply(null, Array(256)).map((E, U) => U),
                Z = (E, U) => W.slice(E, U),
                Y = Z(32, 127),
                F = Z(0, 24);
              F.push(25), F.push.apply(F, Z(28, 32));
              let j = Z(0, 14),
                $;
              for ($ in (Q.setDefault(1, 0), Q.addMany(Y, 0, 2, 0), j))
                Q.addMany([24, 26, 153, 154], $, 3, 0),
                  Q.addMany(Z(128, 144), $, 3, 0),
                  Q.addMany(Z(144, 152), $, 3, 0),
                  Q.add(156, $, 0, 0),
                  Q.add(27, $, 11, 1),
                  Q.add(157, $, 4, 8),
                  Q.addMany([152, 158, 159], $, 0, 7),
                  Q.add(155, $, 11, 3),
                  Q.add(144, $, 11, 9);
              return (
                Q.addMany(F, 0, 3, 0),
                Q.addMany(F, 1, 3, 1),
                Q.add(127, 1, 0, 1),
                Q.addMany(F, 8, 0, 8),
                Q.addMany(F, 3, 3, 3),
                Q.add(127, 3, 0, 3),
                Q.addMany(F, 4, 3, 4),
                Q.add(127, 4, 0, 4),
                Q.addMany(F, 6, 3, 6),
                Q.addMany(F, 5, 3, 5),
                Q.add(127, 5, 0, 5),
                Q.addMany(F, 2, 3, 2),
                Q.add(127, 2, 0, 2),
                Q.add(93, 1, 4, 8),
                Q.addMany(Y, 8, 5, 8),
                Q.add(127, 8, 5, 8),
                Q.addMany([156, 27, 24, 26, 7], 8, 6, 0),
                Q.addMany(Z(28, 32), 8, 0, 8),
                Q.addMany([88, 94, 95], 1, 0, 7),
                Q.addMany(Y, 7, 0, 7),
                Q.addMany(F, 7, 0, 7),
                Q.add(156, 7, 0, 0),
                Q.add(127, 7, 0, 7),
                Q.add(91, 1, 11, 3),
                Q.addMany(Z(64, 127), 3, 7, 0),
                Q.addMany(Z(48, 60), 3, 8, 4),
                Q.addMany([60, 61, 62, 63], 3, 9, 4),
                Q.addMany(Z(48, 60), 4, 8, 4),
                Q.addMany(Z(64, 127), 4, 7, 0),
                Q.addMany([60, 61, 62, 63], 4, 0, 6),
                Q.addMany(Z(32, 64), 6, 0, 6),
                Q.add(127, 6, 0, 6),
                Q.addMany(Z(64, 127), 6, 0, 0),
                Q.addMany(Z(32, 48), 3, 9, 5),
                Q.addMany(Z(32, 48), 5, 9, 5),
                Q.addMany(Z(48, 64), 5, 0, 6),
                Q.addMany(Z(64, 127), 5, 7, 0),
                Q.addMany(Z(32, 48), 4, 9, 5),
                Q.addMany(Z(32, 48), 1, 9, 2),
                Q.addMany(Z(32, 48), 2, 9, 2),
                Q.addMany(Z(48, 127), 2, 10, 0),
                Q.addMany(Z(48, 80), 1, 10, 0),
                Q.addMany(Z(81, 88), 1, 10, 0),
                Q.addMany([89, 90, 92], 1, 10, 0),
                Q.addMany(Z(96, 127), 1, 10, 0),
                Q.add(80, 1, 11, 9),
                Q.addMany(F, 9, 0, 9),
                Q.add(127, 9, 0, 9),
                Q.addMany(Z(28, 32), 9, 0, 9),
                Q.addMany(Z(32, 48), 9, 9, 12),
                Q.addMany(Z(48, 60), 9, 8, 10),
                Q.addMany([60, 61, 62, 63], 9, 9, 10),
                Q.addMany(F, 11, 0, 11),
                Q.addMany(Z(32, 128), 11, 0, 11),
                Q.addMany(Z(28, 32), 11, 0, 11),
                Q.addMany(F, 10, 0, 10),
                Q.add(127, 10, 0, 10),
                Q.addMany(Z(28, 32), 10, 0, 10),
                Q.addMany(Z(48, 60), 10, 8, 10),
                Q.addMany([60, 61, 62, 63], 10, 0, 11),
                Q.addMany(Z(32, 48), 10, 9, 12),
                Q.addMany(F, 12, 0, 12),
                Q.add(127, 12, 0, 12),
                Q.addMany(Z(28, 32), 12, 0, 12),
                Q.addMany(Z(32, 48), 12, 9, 12),
                Q.addMany(Z(48, 64), 12, 0, 11),
                Q.addMany(Z(64, 127), 12, 12, 13),
                Q.addMany(Z(64, 127), 10, 12, 13),
                Q.addMany(Z(64, 127), 9, 12, 13),
                Q.addMany(F, 13, 13, 13),
                Q.addMany(Y, 13, 13, 13),
                Q.add(127, 13, 0, 13),
                Q.addMany([27, 156, 24, 26], 13, 14, 0),
                Q.add(X, 0, 2, 0),
                Q.add(X, 8, 5, 8),
                Q.add(X, 6, 0, 6),
                Q.add(X, 11, 0, 11),
                Q.add(X, 13, 13, 13),
                Q
              );
            })();
            class G extends P.Disposable {
              constructor(Q = H.VT500_TRANSITION_TABLE) {
                super(),
                  (this._transitions = Q),
                  (this._parseStack = {
                    state: 0,
                    handlers: [],
                    handlerPos: 0,
                    transition: 0,
                    chunkPos: 0,
                  }),
                  (this.initialState = 0),
                  (this.currentState = this.initialState),
                  (this._params = new V.Params()),
                  this._params.addParam(0),
                  (this._collect = 0),
                  (this.precedingCodepoint = 0),
                  (this._printHandlerFb = (W, Z, Y) => {}),
                  (this._executeHandlerFb = (W) => {}),
                  (this._csiHandlerFb = (W, Z) => {}),
                  (this._escHandlerFb = (W) => {}),
                  (this._errorHandlerFb = (W) => W),
                  (this._printHandler = this._printHandlerFb),
                  (this._executeHandlers = Object.create(null)),
                  (this._csiHandlers = Object.create(null)),
                  (this._escHandlers = Object.create(null)),
                  this.register(
                    (0, P.toDisposable)(() => {
                      (this._csiHandlers = Object.create(null)),
                        (this._executeHandlers = Object.create(null)),
                        (this._escHandlers = Object.create(null));
                    })
                  ),
                  (this._oscParser = this.register(new q.OscParser())),
                  (this._dcsParser = this.register(new J.DcsParser())),
                  (this._errorHandler = this._errorHandlerFb),
                  this.registerEscHandler({ final: "\\" }, () => !0);
              }
              _identifier(Q, W = [64, 126]) {
                let Z = 0;
                if (Q.prefix) {
                  if (Q.prefix.length > 1)
                    throw Error("only one byte as prefix supported");
                  if (((Z = Q.prefix.charCodeAt(0)), (Z && 60 > Z) || Z > 63))
                    throw Error("prefix must be in range 0x3c .. 0x3f");
                }
                if (Q.intermediates) {
                  if (Q.intermediates.length > 2)
                    throw Error(
                      "only two bytes as intermediates are supported"
                    );
                  for (let F = 0; F < Q.intermediates.length; ++F) {
                    let j = Q.intermediates.charCodeAt(F);
                    if (32 > j || j > 47)
                      throw Error("intermediate must be in range 0x20 .. 0x2f");
                    (Z <<= 8), (Z |= j);
                  }
                }
                if (Q.final.length !== 1)
                  throw Error("final must be a single byte");
                let Y = Q.final.charCodeAt(0);
                if (W[0] > Y || Y > W[1])
                  throw Error(`final must be in range ${W[0]} .. ${W[1]}`);
                return (Z <<= 8), (Z |= Y), Z;
              }
              identToString(Q) {
                let W = [];
                for (; Q; ) W.push(String.fromCharCode(255 & Q)), (Q >>= 8);
                return W.reverse().join("");
              }
              setPrintHandler(Q) {
                this._printHandler = Q;
              }
              clearPrintHandler() {
                this._printHandler = this._printHandlerFb;
              }
              registerEscHandler(Q, W) {
                let Z = this._identifier(Q, [48, 126]);
                this._escHandlers[Z] === void 0 && (this._escHandlers[Z] = []);
                let Y = this._escHandlers[Z];
                return (
                  Y.push(W),
                  {
                    dispose: () => {
                      let F = Y.indexOf(W);
                      F !== -1 && Y.splice(F, 1);
                    },
                  }
                );
              }
              clearEscHandler(Q) {
                this._escHandlers[this._identifier(Q, [48, 126])] &&
                  delete this._escHandlers[this._identifier(Q, [48, 126])];
              }
              setEscHandlerFallback(Q) {
                this._escHandlerFb = Q;
              }
              setExecuteHandler(Q, W) {
                this._executeHandlers[Q.charCodeAt(0)] = W;
              }
              clearExecuteHandler(Q) {
                this._executeHandlers[Q.charCodeAt(0)] &&
                  delete this._executeHandlers[Q.charCodeAt(0)];
              }
              setExecuteHandlerFallback(Q) {
                this._executeHandlerFb = Q;
              }
              registerCsiHandler(Q, W) {
                let Z = this._identifier(Q);
                this._csiHandlers[Z] === void 0 && (this._csiHandlers[Z] = []);
                let Y = this._csiHandlers[Z];
                return (
                  Y.push(W),
                  {
                    dispose: () => {
                      let F = Y.indexOf(W);
                      F !== -1 && Y.splice(F, 1);
                    },
                  }
                );
              }
              clearCsiHandler(Q) {
                this._csiHandlers[this._identifier(Q)] &&
                  delete this._csiHandlers[this._identifier(Q)];
              }
              setCsiHandlerFallback(Q) {
                this._csiHandlerFb = Q;
              }
              registerDcsHandler(Q, W) {
                return this._dcsParser.registerHandler(this._identifier(Q), W);
              }
              clearDcsHandler(Q) {
                this._dcsParser.clearHandler(this._identifier(Q));
              }
              setDcsHandlerFallback(Q) {
                this._dcsParser.setHandlerFallback(Q);
              }
              registerOscHandler(Q, W) {
                return this._oscParser.registerHandler(Q, W);
              }
              clearOscHandler(Q) {
                this._oscParser.clearHandler(Q);
              }
              setOscHandlerFallback(Q) {
                this._oscParser.setHandlerFallback(Q);
              }
              setErrorHandler(Q) {
                this._errorHandler = Q;
              }
              clearErrorHandler() {
                this._errorHandler = this._errorHandlerFb;
              }
              reset() {
                (this.currentState = this.initialState),
                  this._oscParser.reset(),
                  this._dcsParser.reset(),
                  this._params.reset(),
                  this._params.addParam(0),
                  (this._collect = 0),
                  (this.precedingCodepoint = 0),
                  this._parseStack.state !== 0 &&
                    ((this._parseStack.state = 2),
                    (this._parseStack.handlers = []));
              }
              _preserveStack(Q, W, Z, Y, F) {
                (this._parseStack.state = Q),
                  (this._parseStack.handlers = W),
                  (this._parseStack.handlerPos = Z),
                  (this._parseStack.transition = Y),
                  (this._parseStack.chunkPos = F);
              }
              parse(Q, W, Z) {
                let Y,
                  F = 0,
                  j = 0,
                  $ = 0;
                if (this._parseStack.state)
                  if (this._parseStack.state === 2)
                    (this._parseStack.state = 0),
                      ($ = this._parseStack.chunkPos + 1);
                  else {
                    if (Z === void 0 || this._parseStack.state === 1)
                      throw (
                        ((this._parseStack.state = 1),
                        Error(
                          "improper continuation due to previous async handler, giving up parsing"
                        ))
                      );
                    let E = this._parseStack.handlers,
                      U = this._parseStack.handlerPos - 1;
                    switch (this._parseStack.state) {
                      case 3:
                        if (Z === !1 && U > -1) {
                          for (
                            ;
                            U >= 0 && ((Y = E[U](this._params)), Y !== !0);
                            U--
                          )
                            if (Y instanceof Promise)
                              return (this._parseStack.handlerPos = U), Y;
                        }
                        this._parseStack.handlers = [];
                        break;
                      case 4:
                        if (Z === !1 && U > -1) {
                          for (; U >= 0 && ((Y = E[U]()), Y !== !0); U--)
                            if (Y instanceof Promise)
                              return (this._parseStack.handlerPos = U), Y;
                        }
                        this._parseStack.handlers = [];
                        break;
                      case 6:
                        if (
                          ((F = Q[this._parseStack.chunkPos]),
                          (Y = this._dcsParser.unhook(F !== 24 && F !== 26, Z)),
                          Y)
                        )
                          return Y;
                        F === 27 && (this._parseStack.transition |= 1),
                          this._params.reset(),
                          this._params.addParam(0),
                          (this._collect = 0);
                        break;
                      case 5:
                        if (
                          ((F = Q[this._parseStack.chunkPos]),
                          (Y = this._oscParser.end(F !== 24 && F !== 26, Z)),
                          Y)
                        )
                          return Y;
                        F === 27 && (this._parseStack.transition |= 1),
                          this._params.reset(),
                          this._params.addParam(0),
                          (this._collect = 0);
                    }
                    (this._parseStack.state = 0),
                      ($ = this._parseStack.chunkPos + 1),
                      (this.precedingCodepoint = 0),
                      (this.currentState = 15 & this._parseStack.transition);
                  }
                for (let E = $; E < W; ++E) {
                  switch (
                    ((F = Q[E]),
                    (j =
                      this._transitions.table[
                        (this.currentState << 8) | (F < 160 ? F : X)
                      ]),
                    j >> 4)
                  ) {
                    case 2:
                      for (let L = E + 1; ; ++L) {
                        if (L >= W || (F = Q[L]) < 32 || (F > 126 && F < X)) {
                          this._printHandler(Q, E, L), (E = L - 1);
                          break;
                        }
                        if (++L >= W || (F = Q[L]) < 32 || (F > 126 && F < X)) {
                          this._printHandler(Q, E, L), (E = L - 1);
                          break;
                        }
                        if (++L >= W || (F = Q[L]) < 32 || (F > 126 && F < X)) {
                          this._printHandler(Q, E, L), (E = L - 1);
                          break;
                        }
                        if (++L >= W || (F = Q[L]) < 32 || (F > 126 && F < X)) {
                          this._printHandler(Q, E, L), (E = L - 1);
                          break;
                        }
                      }
                      break;
                    case 3:
                      this._executeHandlers[F]
                        ? this._executeHandlers[F]()
                        : this._executeHandlerFb(F),
                        (this.precedingCodepoint = 0);
                      break;
                    case 0:
                      break;
                    case 1:
                      if (
                        this._errorHandler({
                          position: E,
                          code: F,
                          currentState: this.currentState,
                          collect: this._collect,
                          params: this._params,
                          abort: !1,
                        }).abort
                      )
                        return;
                      break;
                    case 7:
                      let U = this._csiHandlers[(this._collect << 8) | F],
                        z = U ? U.length - 1 : -1;
                      for (
                        ;
                        z >= 0 && ((Y = U[z](this._params)), Y !== !0);
                        z--
                      )
                        if (Y instanceof Promise)
                          return this._preserveStack(3, U, z, j, E), Y;
                      z < 0 &&
                        this._csiHandlerFb(
                          (this._collect << 8) | F,
                          this._params
                        ),
                        (this.precedingCodepoint = 0);
                      break;
                    case 8:
                      do
                        switch (F) {
                          case 59:
                            this._params.addParam(0);
                            break;
                          case 58:
                            this._params.addSubParam(-1);
                            break;
                          default:
                            this._params.addDigit(F - 48);
                        }
                      while (++E < W && (F = Q[E]) > 47 && F < 60);
                      E--;
                      break;
                    case 9:
                      (this._collect <<= 8), (this._collect |= F);
                      break;
                    case 10:
                      let k = this._escHandlers[(this._collect << 8) | F],
                        O = k ? k.length - 1 : -1;
                      for (; O >= 0 && ((Y = k[O]()), Y !== !0); O--)
                        if (Y instanceof Promise)
                          return this._preserveStack(4, k, O, j, E), Y;
                      O < 0 && this._escHandlerFb((this._collect << 8) | F),
                        (this.precedingCodepoint = 0);
                      break;
                    case 11:
                      this._params.reset(),
                        this._params.addParam(0),
                        (this._collect = 0);
                      break;
                    case 12:
                      this._dcsParser.hook(
                        (this._collect << 8) | F,
                        this._params
                      );
                      break;
                    case 13:
                      for (let L = E + 1; ; ++L)
                        if (
                          L >= W ||
                          (F = Q[L]) === 24 ||
                          F === 26 ||
                          F === 27 ||
                          (F > 127 && F < X)
                        ) {
                          this._dcsParser.put(Q, E, L), (E = L - 1);
                          break;
                        }
                      break;
                    case 14:
                      if (
                        ((Y = this._dcsParser.unhook(F !== 24 && F !== 26)), Y)
                      )
                        return this._preserveStack(6, [], 0, j, E), Y;
                      F === 27 && (j |= 1),
                        this._params.reset(),
                        this._params.addParam(0),
                        (this._collect = 0),
                        (this.precedingCodepoint = 0);
                      break;
                    case 4:
                      this._oscParser.start();
                      break;
                    case 5:
                      for (let L = E + 1; ; L++)
                        if (L >= W || (F = Q[L]) < 32 || (F > 127 && F < X)) {
                          this._oscParser.put(Q, E, L), (E = L - 1);
                          break;
                        }
                      break;
                    case 6:
                      if (((Y = this._oscParser.end(F !== 24 && F !== 26)), Y))
                        return this._preserveStack(5, [], 0, j, E), Y;
                      F === 27 && (j |= 1),
                        this._params.reset(),
                        this._params.addParam(0),
                        (this._collect = 0),
                        (this.precedingCodepoint = 0);
                  }
                  this.currentState = 15 & j;
                }
              }
            }
            H.EscapeSequenceParser = G;
          },
          6242: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.OscHandler = H.OscParser = void 0);
            let P = K(5770),
              V = K(482),
              q = [];
            (H.OscParser = class {
              constructor() {
                (this._state = 0),
                  (this._active = q),
                  (this._id = -1),
                  (this._handlers = Object.create(null)),
                  (this._handlerFb = () => {}),
                  (this._stack = {
                    paused: !1,
                    loopPosition: 0,
                    fallThrough: !1,
                  });
              }
              registerHandler(J, N) {
                this._handlers[J] === void 0 && (this._handlers[J] = []);
                let X = this._handlers[J];
                return (
                  X.push(N),
                  {
                    dispose: () => {
                      let G = X.indexOf(N);
                      G !== -1 && X.splice(G, 1);
                    },
                  }
                );
              }
              clearHandler(J) {
                this._handlers[J] && delete this._handlers[J];
              }
              setHandlerFallback(J) {
                this._handlerFb = J;
              }
              dispose() {
                (this._handlers = Object.create(null)),
                  (this._handlerFb = () => {}),
                  (this._active = q);
              }
              reset() {
                if (this._state === 2)
                  for (
                    let J = this._stack.paused
                      ? this._stack.loopPosition - 1
                      : this._active.length - 1;
                    J >= 0;
                    --J
                  )
                    this._active[J].end(!1);
                (this._stack.paused = !1),
                  (this._active = q),
                  (this._id = -1),
                  (this._state = 0);
              }
              _start() {
                if (
                  ((this._active = this._handlers[this._id] || q),
                  this._active.length)
                )
                  for (let J = this._active.length - 1; J >= 0; J--)
                    this._active[J].start();
                else this._handlerFb(this._id, "START");
              }
              _put(J, N, X) {
                if (this._active.length)
                  for (let G = this._active.length - 1; G >= 0; G--)
                    this._active[G].put(J, N, X);
                else
                  this._handlerFb(
                    this._id,
                    "PUT",
                    (0, V.utf32ToString)(J, N, X)
                  );
              }
              start() {
                this.reset(), (this._state = 1);
              }
              put(J, N, X) {
                if (this._state !== 3) {
                  if (this._state === 1)
                    for (; N < X; ) {
                      let G = J[N++];
                      if (G === 59) {
                        (this._state = 2), this._start();
                        break;
                      }
                      if (G < 48 || 57 < G) return void (this._state = 3);
                      this._id === -1 && (this._id = 0),
                        (this._id = 10 * this._id + G - 48);
                    }
                  this._state === 2 && X - N > 0 && this._put(J, N, X);
                }
              }
              end(J, N = !0) {
                if (this._state !== 0) {
                  if (this._state !== 3)
                    if (
                      (this._state === 1 && this._start(), this._active.length)
                    ) {
                      let X = !1,
                        G = this._active.length - 1,
                        Q = !1;
                      if (
                        (this._stack.paused &&
                          ((G = this._stack.loopPosition - 1),
                          (X = N),
                          (Q = this._stack.fallThrough),
                          (this._stack.paused = !1)),
                        !Q && X === !1)
                      ) {
                        for (
                          ;
                          G >= 0 && ((X = this._active[G].end(J)), X !== !0);
                          G--
                        )
                          if (X instanceof Promise)
                            return (
                              (this._stack.paused = !0),
                              (this._stack.loopPosition = G),
                              (this._stack.fallThrough = !1),
                              X
                            );
                        G--;
                      }
                      for (; G >= 0; G--)
                        if (
                          ((X = this._active[G].end(!1)), X instanceof Promise)
                        )
                          return (
                            (this._stack.paused = !0),
                            (this._stack.loopPosition = G),
                            (this._stack.fallThrough = !0),
                            X
                          );
                    } else this._handlerFb(this._id, "END", J);
                  (this._active = q), (this._id = -1), (this._state = 0);
                }
              }
            }),
              (H.OscHandler = class {
                constructor(J) {
                  (this._handler = J), (this._data = ""), (this._hitLimit = !1);
                }
                start() {
                  (this._data = ""), (this._hitLimit = !1);
                }
                put(J, N, X) {
                  this._hitLimit ||
                    ((this._data += (0, V.utf32ToString)(J, N, X)),
                    this._data.length > P.PAYLOAD_LIMIT &&
                      ((this._data = ""), (this._hitLimit = !0)));
                }
                end(J) {
                  let N = !1;
                  if (this._hitLimit) N = !1;
                  else if (
                    J &&
                    ((N = this._handler(this._data)), N instanceof Promise)
                  )
                    return N.then(
                      (X) => ((this._data = ""), (this._hitLimit = !1), X)
                    );
                  return (this._data = ""), (this._hitLimit = !1), N;
                }
              });
          },
          8742: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.Params = void 0);
            let K = 2147483647;
            class P {
              static fromArray(V) {
                let q = new P();
                if (!V.length) return q;
                for (let J = Array.isArray(V[0]) ? 1 : 0; J < V.length; ++J) {
                  let N = V[J];
                  if (Array.isArray(N))
                    for (let X = 0; X < N.length; ++X) q.addSubParam(N[X]);
                  else q.addParam(N);
                }
                return q;
              }
              constructor(V = 32, q = 32) {
                if (
                  ((this.maxLength = V), (this.maxSubParamsLength = q), q > 256)
                )
                  throw Error(
                    "maxSubParamsLength must not be greater than 256"
                  );
                (this.params = new Int32Array(V)),
                  (this.length = 0),
                  (this._subParams = new Int32Array(q)),
                  (this._subParamsLength = 0),
                  (this._subParamsIdx = new Uint16Array(V)),
                  (this._rejectDigits = !1),
                  (this._rejectSubDigits = !1),
                  (this._digitIsSub = !1);
              }
              clone() {
                let V = new P(this.maxLength, this.maxSubParamsLength);
                return (
                  V.params.set(this.params),
                  (V.length = this.length),
                  V._subParams.set(this._subParams),
                  (V._subParamsLength = this._subParamsLength),
                  V._subParamsIdx.set(this._subParamsIdx),
                  (V._rejectDigits = this._rejectDigits),
                  (V._rejectSubDigits = this._rejectSubDigits),
                  (V._digitIsSub = this._digitIsSub),
                  V
                );
              }
              toArray() {
                let V = [];
                for (let q = 0; q < this.length; ++q) {
                  V.push(this.params[q]);
                  let J = this._subParamsIdx[q] >> 8,
                    N = 255 & this._subParamsIdx[q];
                  N - J > 0 &&
                    V.push(Array.prototype.slice.call(this._subParams, J, N));
                }
                return V;
              }
              reset() {
                (this.length = 0),
                  (this._subParamsLength = 0),
                  (this._rejectDigits = !1),
                  (this._rejectSubDigits = !1),
                  (this._digitIsSub = !1);
              }
              addParam(V) {
                if (((this._digitIsSub = !1), this.length >= this.maxLength))
                  this._rejectDigits = !0;
                else {
                  if (V < -1)
                    throw Error("values lesser than -1 are not allowed");
                  (this._subParamsIdx[this.length] =
                    (this._subParamsLength << 8) | this._subParamsLength),
                    (this.params[this.length++] = V > K ? K : V);
                }
              }
              addSubParam(V) {
                if (((this._digitIsSub = !0), this.length))
                  if (
                    this._rejectDigits ||
                    this._subParamsLength >= this.maxSubParamsLength
                  )
                    this._rejectSubDigits = !0;
                  else {
                    if (V < -1)
                      throw Error("values lesser than -1 are not allowed");
                    (this._subParams[this._subParamsLength++] = V > K ? K : V),
                      this._subParamsIdx[this.length - 1]++;
                  }
              }
              hasSubParams(V) {
                return (
                  (255 & this._subParamsIdx[V]) - (this._subParamsIdx[V] >> 8) >
                  0
                );
              }
              getSubParams(V) {
                let q = this._subParamsIdx[V] >> 8,
                  J = 255 & this._subParamsIdx[V];
                return J - q > 0 ? this._subParams.subarray(q, J) : null;
              }
              getSubParamsAll() {
                let V = {};
                for (let q = 0; q < this.length; ++q) {
                  let J = this._subParamsIdx[q] >> 8,
                    N = 255 & this._subParamsIdx[q];
                  N - J > 0 && (V[q] = this._subParams.slice(J, N));
                }
                return V;
              }
              addDigit(V) {
                let q;
                if (
                  this._rejectDigits ||
                  !(q = this._digitIsSub
                    ? this._subParamsLength
                    : this.length) ||
                  (this._digitIsSub && this._rejectSubDigits)
                )
                  return;
                let J = this._digitIsSub ? this._subParams : this.params,
                  N = J[q - 1];
                J[q - 1] = ~N ? Math.min(10 * N + V, K) : V;
              }
            }
            H.Params = P;
          },
          5741: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.AddonManager = void 0),
              (H.AddonManager = class {
                constructor() {
                  this._addons = [];
                }
                dispose() {
                  for (let K = this._addons.length - 1; K >= 0; K--)
                    this._addons[K].instance.dispose();
                }
                loadAddon(K, P) {
                  let V = { instance: P, dispose: P.dispose, isDisposed: !1 };
                  this._addons.push(V),
                    (P.dispose = () => this._wrappedAddonDispose(V)),
                    P.activate(K);
                }
                _wrappedAddonDispose(K) {
                  if (K.isDisposed) return;
                  let P = -1;
                  for (let V = 0; V < this._addons.length; V++)
                    if (this._addons[V] === K) {
                      P = V;
                      break;
                    }
                  if (P === -1)
                    throw Error(
                      "Could not dispose an addon that has not been loaded"
                    );
                  (K.isDisposed = !0),
                    K.dispose.apply(K.instance),
                    this._addons.splice(P, 1);
                }
              });
          },
          8771: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.BufferApiView = void 0);
            let P = K(3785),
              V = K(511);
            H.BufferApiView = class {
              constructor(q, J) {
                (this._buffer = q), (this.type = J);
              }
              init(q) {
                return (this._buffer = q), this;
              }
              get cursorY() {
                return this._buffer.y;
              }
              get cursorX() {
                return this._buffer.x;
              }
              get viewportY() {
                return this._buffer.ydisp;
              }
              get baseY() {
                return this._buffer.ybase;
              }
              get length() {
                return this._buffer.lines.length;
              }
              getLine(q) {
                let J = this._buffer.lines.get(q);
                if (J) return new P.BufferLineApiView(J);
              }
              getNullCell() {
                return new V.CellData();
              }
            };
          },
          3785: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.BufferLineApiView = void 0);
            let P = K(511);
            H.BufferLineApiView = class {
              constructor(V) {
                this._line = V;
              }
              get isWrapped() {
                return this._line.isWrapped;
              }
              get length() {
                return this._line.length;
              }
              getCell(V, q) {
                if (!(V < 0 || V >= this._line.length))
                  return q
                    ? (this._line.loadCell(V, q), q)
                    : this._line.loadCell(V, new P.CellData());
              }
              translateToString(V, q, J) {
                return this._line.translateToString(V, q, J);
              }
            };
          },
          8285: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.BufferNamespaceApi = void 0);
            let P = K(8771),
              V = K(8460),
              q = K(844);
            class J extends q.Disposable {
              constructor(N) {
                super(),
                  (this._core = N),
                  (this._onBufferChange = this.register(new V.EventEmitter())),
                  (this.onBufferChange = this._onBufferChange.event),
                  (this._normal = new P.BufferApiView(
                    this._core.buffers.normal,
                    "normal"
                  )),
                  (this._alternate = new P.BufferApiView(
                    this._core.buffers.alt,
                    "alternate"
                  )),
                  this._core.buffers.onBufferActivate(() =>
                    this._onBufferChange.fire(this.active)
                  );
              }
              get active() {
                if (this._core.buffers.active === this._core.buffers.normal)
                  return this.normal;
                if (this._core.buffers.active === this._core.buffers.alt)
                  return this.alternate;
                throw Error("Active buffer is neither normal nor alternate");
              }
              get normal() {
                return this._normal.init(this._core.buffers.normal);
              }
              get alternate() {
                return this._alternate.init(this._core.buffers.alt);
              }
            }
            H.BufferNamespaceApi = J;
          },
          7975: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.ParserApi = void 0),
              (H.ParserApi = class {
                constructor(K) {
                  this._core = K;
                }
                registerCsiHandler(K, P) {
                  return this._core.registerCsiHandler(K, (V) =>
                    P(V.toArray())
                  );
                }
                addCsiHandler(K, P) {
                  return this.registerCsiHandler(K, P);
                }
                registerDcsHandler(K, P) {
                  return this._core.registerDcsHandler(K, (V, q) =>
                    P(V, q.toArray())
                  );
                }
                addDcsHandler(K, P) {
                  return this.registerDcsHandler(K, P);
                }
                registerEscHandler(K, P) {
                  return this._core.registerEscHandler(K, P);
                }
                addEscHandler(K, P) {
                  return this.registerEscHandler(K, P);
                }
                registerOscHandler(K, P) {
                  return this._core.registerOscHandler(K, P);
                }
                addOscHandler(K, P) {
                  return this.registerOscHandler(K, P);
                }
              });
          },
          7090: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.UnicodeApi = void 0),
              (H.UnicodeApi = class {
                constructor(K) {
                  this._core = K;
                }
                register(K) {
                  this._core.unicodeService.register(K);
                }
                get versions() {
                  return this._core.unicodeService.versions;
                }
                get activeVersion() {
                  return this._core.unicodeService.activeVersion;
                }
                set activeVersion(K) {
                  this._core.unicodeService.activeVersion = K;
                }
              });
          },
          744: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (Q, W, Z, Y) {
                  var F,
                    j = arguments.length,
                    $ =
                      j < 3
                        ? W
                        : Y === null
                          ? (Y = Object.getOwnPropertyDescriptor(W, Z))
                          : Y;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    $ = Reflect.decorate(Q, W, Z, Y);
                  else
                    for (var E = Q.length - 1; E >= 0; E--)
                      (F = Q[E]) &&
                        ($ =
                          (j < 3 ? F($) : j > 3 ? F(W, Z, $) : F(W, Z)) || $);
                  return j > 3 && $ && Object.defineProperty(W, Z, $), $;
                },
              V =
                (this && this.__param) ||
                function (Q, W) {
                  return function (Z, Y) {
                    W(Z, Y, Q);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.BufferService = H.MINIMUM_ROWS = H.MINIMUM_COLS = void 0);
            let q = K(8460),
              J = K(844),
              N = K(5295),
              X = K(2585);
            (H.MINIMUM_COLS = 2), (H.MINIMUM_ROWS = 1);
            let G = (H.BufferService = class extends J.Disposable {
              get buffer() {
                return this.buffers.active;
              }
              constructor(Q) {
                super(),
                  (this.isUserScrolling = !1),
                  (this._onResize = this.register(new q.EventEmitter())),
                  (this.onResize = this._onResize.event),
                  (this._onScroll = this.register(new q.EventEmitter())),
                  (this.onScroll = this._onScroll.event),
                  (this.cols = Math.max(
                    Q.rawOptions.cols || 0,
                    H.MINIMUM_COLS
                  )),
                  (this.rows = Math.max(
                    Q.rawOptions.rows || 0,
                    H.MINIMUM_ROWS
                  )),
                  (this.buffers = this.register(new N.BufferSet(Q, this)));
              }
              resize(Q, W) {
                (this.cols = Q),
                  (this.rows = W),
                  this.buffers.resize(Q, W),
                  this._onResize.fire({ cols: Q, rows: W });
              }
              reset() {
                this.buffers.reset(), (this.isUserScrolling = !1);
              }
              scroll(Q, W = !1) {
                let Z = this.buffer,
                  Y;
                (Y = this._cachedBlankLine),
                  (Y &&
                    Y.length === this.cols &&
                    Y.getFg(0) === Q.fg &&
                    Y.getBg(0) === Q.bg) ||
                    ((Y = Z.getBlankLine(Q, W)), (this._cachedBlankLine = Y)),
                  (Y.isWrapped = W);
                let F = Z.ybase + Z.scrollTop,
                  j = Z.ybase + Z.scrollBottom;
                if (Z.scrollTop === 0) {
                  let $ = Z.lines.isFull;
                  j === Z.lines.length - 1
                    ? $
                      ? Z.lines.recycle().copyFrom(Y)
                      : Z.lines.push(Y.clone())
                    : Z.lines.splice(j + 1, 0, Y.clone()),
                    $
                      ? this.isUserScrolling &&
                        (Z.ydisp = Math.max(Z.ydisp - 1, 0))
                      : (Z.ybase++, this.isUserScrolling || Z.ydisp++);
                } else {
                  let $ = j - F + 1;
                  Z.lines.shiftElements(F + 1, $ - 1, -1),
                    Z.lines.set(j, Y.clone());
                }
                this.isUserScrolling || (Z.ydisp = Z.ybase),
                  this._onScroll.fire(Z.ydisp);
              }
              scrollLines(Q, W, Z) {
                let Y = this.buffer;
                if (Q < 0) {
                  if (Y.ydisp === 0) return;
                  this.isUserScrolling = !0;
                } else Q + Y.ydisp >= Y.ybase && (this.isUserScrolling = !1);
                let F = Y.ydisp;
                (Y.ydisp = Math.max(Math.min(Y.ydisp + Q, Y.ybase), 0)),
                  F !== Y.ydisp && (W || this._onScroll.fire(Y.ydisp));
              }
            });
            H.BufferService = G = P([V(0, X.IOptionsService)], G);
          },
          7994: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.CharsetService = void 0),
              (H.CharsetService = class {
                constructor() {
                  (this.glevel = 0), (this._charsets = []);
                }
                reset() {
                  (this.charset = void 0),
                    (this._charsets = []),
                    (this.glevel = 0);
                }
                setgLevel(K) {
                  (this.glevel = K), (this.charset = this._charsets[K]);
                }
                setgCharset(K, P) {
                  (this._charsets[K] = P),
                    this.glevel === K && (this.charset = P);
                }
              });
          },
          1753: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (Y, F, j, $) {
                  var E,
                    U = arguments.length,
                    z =
                      U < 3
                        ? F
                        : $ === null
                          ? ($ = Object.getOwnPropertyDescriptor(F, j))
                          : $;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    z = Reflect.decorate(Y, F, j, $);
                  else
                    for (var k = Y.length - 1; k >= 0; k--)
                      (E = Y[k]) &&
                        (z =
                          (U < 3 ? E(z) : U > 3 ? E(F, j, z) : E(F, j)) || z);
                  return U > 3 && z && Object.defineProperty(F, j, z), z;
                },
              V =
                (this && this.__param) ||
                function (Y, F) {
                  return function (j, $) {
                    F(j, $, Y);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.CoreMouseService = void 0);
            let q = K(2585),
              J = K(8460),
              N = K(844),
              X = {
                NONE: { events: 0, restrict: () => !1 },
                X10: {
                  events: 1,
                  restrict: (Y) =>
                    Y.button !== 4 &&
                    Y.action === 1 &&
                    ((Y.ctrl = !1), (Y.alt = !1), (Y.shift = !1), !0),
                },
                VT200: { events: 19, restrict: (Y) => Y.action !== 32 },
                DRAG: {
                  events: 23,
                  restrict: (Y) => Y.action !== 32 || Y.button !== 3,
                },
                ANY: { events: 31, restrict: (Y) => !0 },
              };
            function G(Y, F) {
              let j = (Y.ctrl ? 16 : 0) | (Y.shift ? 4 : 0) | (Y.alt ? 8 : 0);
              return (
                Y.button === 4
                  ? ((j |= 64), (j |= Y.action))
                  : ((j |= 3 & Y.button),
                    4 & Y.button && (j |= 64),
                    8 & Y.button && (j |= 128),
                    Y.action === 32
                      ? (j |= 32)
                      : Y.action !== 0 || F || (j |= 3)),
                j
              );
            }
            let Q = String.fromCharCode,
              W = {
                DEFAULT: (Y) => {
                  let F = [G(Y, !1) + 32, Y.col + 32, Y.row + 32];
                  return F[0] > 255 || F[1] > 255 || F[2] > 255
                    ? ""
                    : `\x1B[M${Q(F[0])}${Q(F[1])}${Q(F[2])}`;
                },
                SGR: (Y) => {
                  let F = Y.action === 0 && Y.button !== 4 ? "m" : "M";
                  return `\x1B[<${G(Y, !0)};${Y.col};${Y.row}${F}`;
                },
                SGR_PIXELS: (Y) => {
                  let F = Y.action === 0 && Y.button !== 4 ? "m" : "M";
                  return `\x1B[<${G(Y, !0)};${Y.x};${Y.y}${F}`;
                },
              },
              Z = (H.CoreMouseService = class extends N.Disposable {
                constructor(Y, F) {
                  super(),
                    (this._bufferService = Y),
                    (this._coreService = F),
                    (this._protocols = {}),
                    (this._encodings = {}),
                    (this._activeProtocol = ""),
                    (this._activeEncoding = ""),
                    (this._lastEvent = null),
                    (this._onProtocolChange = this.register(
                      new J.EventEmitter()
                    )),
                    (this.onProtocolChange = this._onProtocolChange.event);
                  for (let j of Object.keys(X)) this.addProtocol(j, X[j]);
                  for (let j of Object.keys(W)) this.addEncoding(j, W[j]);
                  this.reset();
                }
                addProtocol(Y, F) {
                  this._protocols[Y] = F;
                }
                addEncoding(Y, F) {
                  this._encodings[Y] = F;
                }
                get activeProtocol() {
                  return this._activeProtocol;
                }
                get areMouseEventsActive() {
                  return this._protocols[this._activeProtocol].events !== 0;
                }
                set activeProtocol(Y) {
                  if (!this._protocols[Y])
                    throw Error(`unknown protocol "${Y}"`);
                  (this._activeProtocol = Y),
                    this._onProtocolChange.fire(this._protocols[Y].events);
                }
                get activeEncoding() {
                  return this._activeEncoding;
                }
                set activeEncoding(Y) {
                  if (!this._encodings[Y])
                    throw Error(`unknown encoding "${Y}"`);
                  this._activeEncoding = Y;
                }
                reset() {
                  (this.activeProtocol = "NONE"),
                    (this.activeEncoding = "DEFAULT"),
                    (this._lastEvent = null);
                }
                triggerMouseEvent(Y) {
                  if (
                    Y.col < 0 ||
                    Y.col >= this._bufferService.cols ||
                    Y.row < 0 ||
                    Y.row >= this._bufferService.rows
                  )
                    return !1;
                  if (Y.button === 4 && Y.action === 32) return !1;
                  if (Y.button === 3 && Y.action !== 32) return !1;
                  if (Y.button !== 4 && (Y.action === 2 || Y.action === 3))
                    return !1;
                  if (
                    (Y.col++,
                    Y.row++,
                    Y.action === 32 &&
                      this._lastEvent &&
                      this._equalEvents(
                        this._lastEvent,
                        Y,
                        this._activeEncoding === "SGR_PIXELS"
                      ))
                  )
                    return !1;
                  if (!this._protocols[this._activeProtocol].restrict(Y))
                    return !1;
                  let F = this._encodings[this._activeEncoding](Y);
                  return (
                    F &&
                      (this._activeEncoding === "DEFAULT"
                        ? this._coreService.triggerBinaryEvent(F)
                        : this._coreService.triggerDataEvent(F, !0)),
                    (this._lastEvent = Y),
                    !0
                  );
                }
                explainEvents(Y) {
                  return {
                    down: !!(1 & Y),
                    up: !!(2 & Y),
                    drag: !!(4 & Y),
                    move: !!(8 & Y),
                    wheel: !!(16 & Y),
                  };
                }
                _equalEvents(Y, F, j) {
                  if (j) {
                    if (Y.x !== F.x) return !1;
                    if (Y.y !== F.y) return !1;
                  } else {
                    if (Y.col !== F.col) return !1;
                    if (Y.row !== F.row) return !1;
                  }
                  return (
                    Y.button === F.button &&
                    Y.action === F.action &&
                    Y.ctrl === F.ctrl &&
                    Y.alt === F.alt &&
                    Y.shift === F.shift
                  );
                }
              });
            H.CoreMouseService = Z = P(
              [V(0, q.IBufferService), V(1, q.ICoreService)],
              Z
            );
          },
          6975: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (Z, Y, F, j) {
                  var $,
                    E = arguments.length,
                    U =
                      E < 3
                        ? Y
                        : j === null
                          ? (j = Object.getOwnPropertyDescriptor(Y, F))
                          : j;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    U = Reflect.decorate(Z, Y, F, j);
                  else
                    for (var z = Z.length - 1; z >= 0; z--)
                      ($ = Z[z]) &&
                        (U =
                          (E < 3 ? $(U) : E > 3 ? $(Y, F, U) : $(Y, F)) || U);
                  return E > 3 && U && Object.defineProperty(Y, F, U), U;
                },
              V =
                (this && this.__param) ||
                function (Z, Y) {
                  return function (F, j) {
                    Y(F, j, Z);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.CoreService = void 0);
            let q = K(1439),
              J = K(8460),
              N = K(844),
              X = K(2585),
              G = Object.freeze({ insertMode: !1 }),
              Q = Object.freeze({
                applicationCursorKeys: !1,
                applicationKeypad: !1,
                bracketedPasteMode: !1,
                origin: !1,
                reverseWraparound: !1,
                sendFocus: !1,
                wraparound: !0,
              }),
              W = (H.CoreService = class extends N.Disposable {
                constructor(Z, Y, F) {
                  super(),
                    (this._bufferService = Z),
                    (this._logService = Y),
                    (this._optionsService = F),
                    (this.isCursorInitialized = !1),
                    (this.isCursorHidden = !1),
                    (this._onData = this.register(new J.EventEmitter())),
                    (this.onData = this._onData.event),
                    (this._onUserInput = this.register(new J.EventEmitter())),
                    (this.onUserInput = this._onUserInput.event),
                    (this._onBinary = this.register(new J.EventEmitter())),
                    (this.onBinary = this._onBinary.event),
                    (this._onRequestScrollToBottom = this.register(
                      new J.EventEmitter()
                    )),
                    (this.onRequestScrollToBottom =
                      this._onRequestScrollToBottom.event),
                    (this.modes = (0, q.clone)(G)),
                    (this.decPrivateModes = (0, q.clone)(Q));
                }
                reset() {
                  (this.modes = (0, q.clone)(G)),
                    (this.decPrivateModes = (0, q.clone)(Q));
                }
                triggerDataEvent(Z, Y = !1) {
                  if (this._optionsService.rawOptions.disableStdin) return;
                  let F = this._bufferService.buffer;
                  Y &&
                    this._optionsService.rawOptions.scrollOnUserInput &&
                    F.ybase !== F.ydisp &&
                    this._onRequestScrollToBottom.fire(),
                    Y && this._onUserInput.fire(),
                    this._logService.debug(`sending data "${Z}"`, () =>
                      Z.split("").map((j) => j.charCodeAt(0))
                    ),
                    this._onData.fire(Z);
                }
                triggerBinaryEvent(Z) {
                  this._optionsService.rawOptions.disableStdin ||
                    (this._logService.debug(`sending binary "${Z}"`, () =>
                      Z.split("").map((Y) => Y.charCodeAt(0))
                    ),
                    this._onBinary.fire(Z));
                }
              });
            H.CoreService = W = P(
              [
                V(0, X.IBufferService),
                V(1, X.ILogService),
                V(2, X.IOptionsService),
              ],
              W
            );
          },
          9074: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.DecorationService = void 0);
            let P = K(8055),
              V = K(8460),
              q = K(844),
              J = K(6106),
              N = 0,
              X = 0;
            class G extends q.Disposable {
              get decorations() {
                return this._decorations.values();
              }
              constructor() {
                super(),
                  (this._decorations = new J.SortedList((W) =>
                    W == null ? void 0 : W.marker.line
                  )),
                  (this._onDecorationRegistered = this.register(
                    new V.EventEmitter()
                  )),
                  (this.onDecorationRegistered =
                    this._onDecorationRegistered.event),
                  (this._onDecorationRemoved = this.register(
                    new V.EventEmitter()
                  )),
                  (this.onDecorationRemoved = this._onDecorationRemoved.event),
                  this.register((0, q.toDisposable)(() => this.reset()));
              }
              registerDecoration(W) {
                if (W.marker.isDisposed) return;
                let Z = new Q(W);
                if (Z) {
                  let Y = Z.marker.onDispose(() => Z.dispose());
                  Z.onDispose(() => {
                    Z &&
                      (this._decorations.delete(Z) &&
                        this._onDecorationRemoved.fire(Z),
                      Y.dispose());
                  }),
                    this._decorations.insert(Z),
                    this._onDecorationRegistered.fire(Z);
                }
                return Z;
              }
              reset() {
                for (let W of this._decorations.values()) W.dispose();
                this._decorations.clear();
              }
              *getDecorationsAtCell(W, Z, Y) {
                var F, j, $;
                let E = 0,
                  U = 0;
                for (let z of this._decorations.getKeyIterator(Z))
                  (E = (F = z.options.x) !== null && F !== void 0 ? F : 0),
                    (U =
                      E +
                      ((j = z.options.width) !== null && j !== void 0 ? j : 1)),
                    W >= E &&
                      W < U &&
                      (!Y ||
                        (($ = z.options.layer) !== null && $ !== void 0
                          ? $
                          : "bottom") === Y) &&
                      (yield z);
              }
              forEachDecorationAtCell(W, Z, Y, F) {
                this._decorations.forEachByKey(Z, (j) => {
                  var $, E, U;
                  (N = ($ = j.options.x) !== null && $ !== void 0 ? $ : 0),
                    (X =
                      N +
                      ((E = j.options.width) !== null && E !== void 0 ? E : 1)),
                    W >= N &&
                      W < X &&
                      (!Y ||
                        ((U = j.options.layer) !== null && U !== void 0
                          ? U
                          : "bottom") === Y) &&
                      F(j);
                });
              }
            }
            H.DecorationService = G;
            class Q extends q.Disposable {
              get isDisposed() {
                return this._isDisposed;
              }
              get backgroundColorRGB() {
                return (
                  this._cachedBg === null &&
                    (this.options.backgroundColor
                      ? (this._cachedBg = P.css.toColor(
                          this.options.backgroundColor
                        ))
                      : (this._cachedBg = void 0)),
                  this._cachedBg
                );
              }
              get foregroundColorRGB() {
                return (
                  this._cachedFg === null &&
                    (this.options.foregroundColor
                      ? (this._cachedFg = P.css.toColor(
                          this.options.foregroundColor
                        ))
                      : (this._cachedFg = void 0)),
                  this._cachedFg
                );
              }
              constructor(W) {
                super(),
                  (this.options = W),
                  (this.onRenderEmitter = this.register(new V.EventEmitter())),
                  (this.onRender = this.onRenderEmitter.event),
                  (this._onDispose = this.register(new V.EventEmitter())),
                  (this.onDispose = this._onDispose.event),
                  (this._cachedBg = null),
                  (this._cachedFg = null),
                  (this.marker = W.marker),
                  this.options.overviewRulerOptions &&
                    !this.options.overviewRulerOptions.position &&
                    (this.options.overviewRulerOptions.position = "full");
              }
              dispose() {
                this._onDispose.fire(), super.dispose();
              }
            }
          },
          4348: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.InstantiationService = H.ServiceCollection = void 0);
            let P = K(2585),
              V = K(8343);
            class q {
              constructor(...J) {
                this._entries = new Map();
                for (let [N, X] of J) this.set(N, X);
              }
              set(J, N) {
                let X = this._entries.get(J);
                return this._entries.set(J, N), X;
              }
              forEach(J) {
                for (let [N, X] of this._entries.entries()) J(N, X);
              }
              has(J) {
                return this._entries.has(J);
              }
              get(J) {
                return this._entries.get(J);
              }
            }
            (H.ServiceCollection = q),
              (H.InstantiationService = class {
                constructor() {
                  (this._services = new q()),
                    this._services.set(P.IInstantiationService, this);
                }
                setService(J, N) {
                  this._services.set(J, N);
                }
                getService(J) {
                  return this._services.get(J);
                }
                createInstance(J, ...N) {
                  let X = (0, V.getServiceDependencies)(J).sort(
                      (W, Z) => W.index - Z.index
                    ),
                    G = [];
                  for (let W of X) {
                    let Z = this._services.get(W.id);
                    if (!Z)
                      throw Error(
                        `[createInstance] ${J.name} depends on UNKNOWN service ${W.id}.`
                      );
                    G.push(Z);
                  }
                  let Q = X.length > 0 ? X[0].index : N.length;
                  if (N.length !== Q)
                    throw Error(
                      `[createInstance] First service dependency of ${J.name} at position ${Q + 1} conflicts with ${N.length} static arguments`
                    );
                  return new J(...[...N, ...G]);
                }
              });
          },
          7866: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (Q, W, Z, Y) {
                  var F,
                    j = arguments.length,
                    $ =
                      j < 3
                        ? W
                        : Y === null
                          ? (Y = Object.getOwnPropertyDescriptor(W, Z))
                          : Y;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    $ = Reflect.decorate(Q, W, Z, Y);
                  else
                    for (var E = Q.length - 1; E >= 0; E--)
                      (F = Q[E]) &&
                        ($ =
                          (j < 3 ? F($) : j > 3 ? F(W, Z, $) : F(W, Z)) || $);
                  return j > 3 && $ && Object.defineProperty(W, Z, $), $;
                },
              V =
                (this && this.__param) ||
                function (Q, W) {
                  return function (Z, Y) {
                    W(Z, Y, Q);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.traceCall = H.setTraceLogger = H.LogService = void 0);
            let q = K(844),
              J = K(2585),
              N = {
                trace: J.LogLevelEnum.TRACE,
                debug: J.LogLevelEnum.DEBUG,
                info: J.LogLevelEnum.INFO,
                warn: J.LogLevelEnum.WARN,
                error: J.LogLevelEnum.ERROR,
                off: J.LogLevelEnum.OFF,
              },
              X,
              G = (H.LogService = class extends q.Disposable {
                get logLevel() {
                  return this._logLevel;
                }
                constructor(Q) {
                  super(),
                    (this._optionsService = Q),
                    (this._logLevel = J.LogLevelEnum.OFF),
                    this._updateLogLevel(),
                    this.register(
                      this._optionsService.onSpecificOptionChange(
                        "logLevel",
                        () => this._updateLogLevel()
                      )
                    ),
                    (X = this);
                }
                _updateLogLevel() {
                  this._logLevel = N[this._optionsService.rawOptions.logLevel];
                }
                _evalLazyOptionalParams(Q) {
                  for (let W = 0; W < Q.length; W++)
                    typeof Q[W] == "function" && (Q[W] = Q[W]());
                }
                _log(Q, W, Z) {
                  this._evalLazyOptionalParams(Z),
                    Q.call(
                      console,
                      (this._optionsService.options.logger
                        ? ""
                        : "xterm.js: ") + W,
                      ...Z
                    );
                }
                trace(Q, ...W) {
                  var Z, Y;
                  this._logLevel <= J.LogLevelEnum.TRACE &&
                    this._log(
                      (Y =
                        (Z = this._optionsService.options.logger) === null ||
                        Z === void 0
                          ? void 0
                          : Z.trace.bind(
                              this._optionsService.options.logger
                            )) !== null && Y !== void 0
                        ? Y
                        : console.log,
                      Q,
                      W
                    );
                }
                debug(Q, ...W) {
                  var Z, Y;
                  this._logLevel <= J.LogLevelEnum.DEBUG &&
                    this._log(
                      (Y =
                        (Z = this._optionsService.options.logger) === null ||
                        Z === void 0
                          ? void 0
                          : Z.debug.bind(
                              this._optionsService.options.logger
                            )) !== null && Y !== void 0
                        ? Y
                        : console.log,
                      Q,
                      W
                    );
                }
                info(Q, ...W) {
                  var Z, Y;
                  this._logLevel <= J.LogLevelEnum.INFO &&
                    this._log(
                      (Y =
                        (Z = this._optionsService.options.logger) === null ||
                        Z === void 0
                          ? void 0
                          : Z.info.bind(
                              this._optionsService.options.logger
                            )) !== null && Y !== void 0
                        ? Y
                        : console.info,
                      Q,
                      W
                    );
                }
                warn(Q, ...W) {
                  var Z, Y;
                  this._logLevel <= J.LogLevelEnum.WARN &&
                    this._log(
                      (Y =
                        (Z = this._optionsService.options.logger) === null ||
                        Z === void 0
                          ? void 0
                          : Z.warn.bind(
                              this._optionsService.options.logger
                            )) !== null && Y !== void 0
                        ? Y
                        : console.warn,
                      Q,
                      W
                    );
                }
                error(Q, ...W) {
                  var Z, Y;
                  this._logLevel <= J.LogLevelEnum.ERROR &&
                    this._log(
                      (Y =
                        (Z = this._optionsService.options.logger) === null ||
                        Z === void 0
                          ? void 0
                          : Z.error.bind(
                              this._optionsService.options.logger
                            )) !== null && Y !== void 0
                        ? Y
                        : console.error,
                      Q,
                      W
                    );
                }
              });
            (H.LogService = G = P([V(0, J.IOptionsService)], G)),
              (H.setTraceLogger = function (Q) {
                X = Q;
              }),
              (H.traceCall = function (Q, W, Z) {
                if (typeof Z.value != "function") throw Error("not supported");
                let Y = Z.value;
                Z.value = function (...F) {
                  if (X.logLevel !== J.LogLevelEnum.TRACE)
                    return Y.apply(this, F);
                  X.trace(
                    `GlyphRenderer#${Y.name}(${F.map(($) => JSON.stringify($)).join(", ")})`
                  );
                  let j = Y.apply(this, F);
                  return X.trace(`GlyphRenderer#${Y.name} return`, j), j;
                };
              });
          },
          7302: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.OptionsService = H.DEFAULT_OPTIONS = void 0);
            let P = K(8460),
              V = K(844),
              q = K(6114);
            H.DEFAULT_OPTIONS = {
              cols: 80,
              rows: 24,
              cursorBlink: !1,
              cursorStyle: "block",
              cursorWidth: 1,
              cursorInactiveStyle: "outline",
              customGlyphs: !0,
              drawBoldTextInBrightColors: !0,
              fastScrollModifier: "alt",
              fastScrollSensitivity: 5,
              fontFamily: "courier-new, courier, monospace",
              fontSize: 15,
              fontWeight: "normal",
              fontWeightBold: "bold",
              ignoreBracketedPasteMode: !1,
              lineHeight: 1,
              letterSpacing: 0,
              linkHandler: null,
              logLevel: "info",
              logger: null,
              scrollback: 1000,
              scrollOnUserInput: !0,
              scrollSensitivity: 1,
              screenReaderMode: !1,
              smoothScrollDuration: 0,
              macOptionIsMeta: !1,
              macOptionClickForcesSelection: !1,
              minimumContrastRatio: 1,
              disableStdin: !1,
              allowProposedApi: !1,
              allowTransparency: !1,
              tabStopWidth: 8,
              theme: {},
              rightClickSelectsWord: q.isMac,
              windowOptions: {},
              windowsMode: !1,
              windowsPty: {},
              wordSeparator: " ()[]{}',\"`",
              altClickMovesCursor: !0,
              convertEol: !1,
              termName: "xterm",
              cancelEvents: !1,
              overviewRulerWidth: 0,
            };
            let J = [
              "normal",
              "bold",
              "100",
              "200",
              "300",
              "400",
              "500",
              "600",
              "700",
              "800",
              "900",
            ];
            class N extends V.Disposable {
              constructor(X) {
                super(),
                  (this._onOptionChange = this.register(new P.EventEmitter())),
                  (this.onOptionChange = this._onOptionChange.event);
                let G = Object.assign({}, H.DEFAULT_OPTIONS);
                for (let Q in X)
                  if (Q in G)
                    try {
                      let W = X[Q];
                      G[Q] = this._sanitizeAndValidateOption(Q, W);
                    } catch (W) {
                      console.error(W);
                    }
                (this.rawOptions = G),
                  (this.options = Object.assign({}, G)),
                  this._setupOptions();
              }
              onSpecificOptionChange(X, G) {
                return this.onOptionChange((Q) => {
                  Q === X && G(this.rawOptions[X]);
                });
              }
              onMultipleOptionChange(X, G) {
                return this.onOptionChange((Q) => {
                  X.indexOf(Q) !== -1 && G();
                });
              }
              _setupOptions() {
                let X = (Q) => {
                    if (!(Q in H.DEFAULT_OPTIONS))
                      throw Error(`No option with key "${Q}"`);
                    return this.rawOptions[Q];
                  },
                  G = (Q, W) => {
                    if (!(Q in H.DEFAULT_OPTIONS))
                      throw Error(`No option with key "${Q}"`);
                    (W = this._sanitizeAndValidateOption(Q, W)),
                      this.rawOptions[Q] !== W &&
                        ((this.rawOptions[Q] = W),
                        this._onOptionChange.fire(Q));
                  };
                for (let Q in this.rawOptions) {
                  let W = { get: X.bind(this, Q), set: G.bind(this, Q) };
                  Object.defineProperty(this.options, Q, W);
                }
              }
              _sanitizeAndValidateOption(X, G) {
                switch (X) {
                  case "cursorStyle":
                    if (
                      (G || (G = H.DEFAULT_OPTIONS[X]),
                      !(function (Q) {
                        return (
                          Q === "block" || Q === "underline" || Q === "bar"
                        );
                      })(G))
                    )
                      throw Error(`"${G}" is not a valid value for ${X}`);
                    break;
                  case "wordSeparator":
                    G || (G = H.DEFAULT_OPTIONS[X]);
                    break;
                  case "fontWeight":
                  case "fontWeightBold":
                    if (typeof G == "number" && 1 <= G && G <= 1000) break;
                    G = J.includes(G) ? G : H.DEFAULT_OPTIONS[X];
                    break;
                  case "cursorWidth":
                    G = Math.floor(G);
                  case "lineHeight":
                  case "tabStopWidth":
                    if (G < 1)
                      throw Error(`${X} cannot be less than 1, value: ${G}`);
                    break;
                  case "minimumContrastRatio":
                    G = Math.max(1, Math.min(21, Math.round(10 * G) / 10));
                    break;
                  case "scrollback":
                    if ((G = Math.min(G, 4294967295)) < 0)
                      throw Error(`${X} cannot be less than 0, value: ${G}`);
                    break;
                  case "fastScrollSensitivity":
                  case "scrollSensitivity":
                    if (G <= 0)
                      throw Error(
                        `${X} cannot be less than or equal to 0, value: ${G}`
                      );
                    break;
                  case "rows":
                  case "cols":
                    if (!G && G !== 0)
                      throw Error(`${X} must be numeric, value: ${G}`);
                    break;
                  case "windowsPty":
                    G = G != null ? G : {};
                }
                return G;
              }
            }
            H.OptionsService = N;
          },
          2660: function (M, H, K) {
            var P =
                (this && this.__decorate) ||
                function (N, X, G, Q) {
                  var W,
                    Z = arguments.length,
                    Y =
                      Z < 3
                        ? X
                        : Q === null
                          ? (Q = Object.getOwnPropertyDescriptor(X, G))
                          : Q;
                  if (
                    typeof Reflect == "object" &&
                    typeof Reflect.decorate == "function"
                  )
                    Y = Reflect.decorate(N, X, G, Q);
                  else
                    for (var F = N.length - 1; F >= 0; F--)
                      (W = N[F]) &&
                        (Y =
                          (Z < 3 ? W(Y) : Z > 3 ? W(X, G, Y) : W(X, G)) || Y);
                  return Z > 3 && Y && Object.defineProperty(X, G, Y), Y;
                },
              V =
                (this && this.__param) ||
                function (N, X) {
                  return function (G, Q) {
                    X(G, Q, N);
                  };
                };
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.OscLinkService = void 0);
            let q = K(2585),
              J = (H.OscLinkService = class {
                constructor(N) {
                  (this._bufferService = N),
                    (this._nextId = 1),
                    (this._entriesWithId = new Map()),
                    (this._dataByLinkId = new Map());
                }
                registerLink(N) {
                  let X = this._bufferService.buffer;
                  if (N.id === void 0) {
                    let F = X.addMarker(X.ybase + X.y),
                      j = { data: N, id: this._nextId++, lines: [F] };
                    return (
                      F.onDispose(() => this._removeMarkerFromLink(j, F)),
                      this._dataByLinkId.set(j.id, j),
                      j.id
                    );
                  }
                  let G = N,
                    Q = this._getEntryIdKey(G),
                    W = this._entriesWithId.get(Q);
                  if (W) return this.addLineToLink(W.id, X.ybase + X.y), W.id;
                  let Z = X.addMarker(X.ybase + X.y),
                    Y = {
                      id: this._nextId++,
                      key: this._getEntryIdKey(G),
                      data: G,
                      lines: [Z],
                    };
                  return (
                    Z.onDispose(() => this._removeMarkerFromLink(Y, Z)),
                    this._entriesWithId.set(Y.key, Y),
                    this._dataByLinkId.set(Y.id, Y),
                    Y.id
                  );
                }
                addLineToLink(N, X) {
                  let G = this._dataByLinkId.get(N);
                  if (G && G.lines.every((Q) => Q.line !== X)) {
                    let Q = this._bufferService.buffer.addMarker(X);
                    G.lines.push(Q),
                      Q.onDispose(() => this._removeMarkerFromLink(G, Q));
                  }
                }
                getLinkData(N) {
                  var X;
                  return (X = this._dataByLinkId.get(N)) === null ||
                    X === void 0
                    ? void 0
                    : X.data;
                }
                _getEntryIdKey(N) {
                  return `${N.id};;${N.uri}`;
                }
                _removeMarkerFromLink(N, X) {
                  let G = N.lines.indexOf(X);
                  G !== -1 &&
                    (N.lines.splice(G, 1),
                    N.lines.length === 0 &&
                      (N.data.id !== void 0 &&
                        this._entriesWithId.delete(N.key),
                      this._dataByLinkId.delete(N.id)));
                }
              });
            H.OscLinkService = J = P([V(0, q.IBufferService)], J);
          },
          8343: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.createDecorator =
                H.getServiceDependencies =
                H.serviceRegistry =
                  void 0);
            let K = "di$target",
              P = "di$dependencies";
            (H.serviceRegistry = new Map()),
              (H.getServiceDependencies = function (V) {
                return V[P] || [];
              }),
              (H.createDecorator = function (V) {
                if (H.serviceRegistry.has(V)) return H.serviceRegistry.get(V);
                let q = function (J, N, X) {
                  if (arguments.length !== 3)
                    throw Error(
                      "@IServiceName-decorator can only be used to decorate a parameter"
                    );
                  (function (G, Q, W) {
                    Q[K] === Q
                      ? Q[P].push({ id: G, index: W })
                      : ((Q[P] = [{ id: G, index: W }]), (Q[K] = Q));
                  })(q, J, X);
                };
                return (q.toString = () => V), H.serviceRegistry.set(V, q), q;
              });
          },
          2585: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.IDecorationService =
                H.IUnicodeService =
                H.IOscLinkService =
                H.IOptionsService =
                H.ILogService =
                H.LogLevelEnum =
                H.IInstantiationService =
                H.ICharsetService =
                H.ICoreService =
                H.ICoreMouseService =
                H.IBufferService =
                  void 0);
            let P = K(8343);
            var V;
            (H.IBufferService = (0, P.createDecorator)("BufferService")),
              (H.ICoreMouseService = (0, P.createDecorator)(
                "CoreMouseService"
              )),
              (H.ICoreService = (0, P.createDecorator)("CoreService")),
              (H.ICharsetService = (0, P.createDecorator)("CharsetService")),
              (H.IInstantiationService = (0, P.createDecorator)(
                "InstantiationService"
              )),
              (function (q) {
                (q[(q.TRACE = 0)] = "TRACE"),
                  (q[(q.DEBUG = 1)] = "DEBUG"),
                  (q[(q.INFO = 2)] = "INFO"),
                  (q[(q.WARN = 3)] = "WARN"),
                  (q[(q.ERROR = 4)] = "ERROR"),
                  (q[(q.OFF = 5)] = "OFF");
              })(V || (H.LogLevelEnum = V = {})),
              (H.ILogService = (0, P.createDecorator)("LogService")),
              (H.IOptionsService = (0, P.createDecorator)("OptionsService")),
              (H.IOscLinkService = (0, P.createDecorator)("OscLinkService")),
              (H.IUnicodeService = (0, P.createDecorator)("UnicodeService")),
              (H.IDecorationService = (0, P.createDecorator)(
                "DecorationService"
              ));
          },
          1480: (M, H, K) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.UnicodeService = void 0);
            let P = K(8460),
              V = K(225);
            H.UnicodeService = class {
              constructor() {
                (this._providers = Object.create(null)),
                  (this._active = ""),
                  (this._onChange = new P.EventEmitter()),
                  (this.onChange = this._onChange.event);
                let q = new V.UnicodeV6();
                this.register(q),
                  (this._active = q.version),
                  (this._activeProvider = q);
              }
              dispose() {
                this._onChange.dispose();
              }
              get versions() {
                return Object.keys(this._providers);
              }
              get activeVersion() {
                return this._active;
              }
              set activeVersion(q) {
                if (!this._providers[q])
                  throw Error(`unknown Unicode version "${q}"`);
                (this._active = q),
                  (this._activeProvider = this._providers[q]),
                  this._onChange.fire(q);
              }
              register(q) {
                this._providers[q.version] = q;
              }
              wcwidth(q) {
                return this._activeProvider.wcwidth(q);
              }
              getStringCellWidth(q) {
                let J = 0,
                  N = q.length;
                for (let X = 0; X < N; ++X) {
                  let G = q.charCodeAt(X);
                  if (55296 <= G && G <= 56319) {
                    if (++X >= N) return J + this.wcwidth(G);
                    let Q = q.charCodeAt(X);
                    56320 <= Q && Q <= 57343
                      ? (G = 1024 * (G - 55296) + Q - 56320 + 65536)
                      : (J += this.wcwidth(Q));
                  }
                  J += this.wcwidth(G);
                }
                return J;
              }
            };
          },
        },
        u = {};
      function c(M) {
        var H = u[M];
        if (H !== void 0) return H.exports;
        var K = (u[M] = { exports: {} });
        return _[M].call(K.exports, K, K.exports, c), K.exports;
      }
      var n = {};
      return (
        (() => {
          var M = n;
          Object.defineProperty(M, "__esModule", { value: !0 }),
            (M.Terminal = void 0);
          let H = c(9042),
            K = c(3236),
            P = c(844),
            V = c(5741),
            q = c(8285),
            J = c(7975),
            N = c(7090),
            X = ["cols", "rows"];
          class G extends P.Disposable {
            constructor(Q) {
              super(),
                (this._core = this.register(new K.Terminal(Q))),
                (this._addonManager = this.register(new V.AddonManager())),
                (this._publicOptions = Object.assign({}, this._core.options));
              let W = (Y) => this._core.options[Y],
                Z = (Y, F) => {
                  this._checkReadonlyOptions(Y), (this._core.options[Y] = F);
                };
              for (let Y in this._core.options) {
                let F = { get: W.bind(this, Y), set: Z.bind(this, Y) };
                Object.defineProperty(this._publicOptions, Y, F);
              }
            }
            _checkReadonlyOptions(Q) {
              if (X.includes(Q))
                throw Error(`Option "${Q}" can only be set in the constructor`);
            }
            _checkProposedApi() {
              if (!this._core.optionsService.rawOptions.allowProposedApi)
                throw Error(
                  "You must set the allowProposedApi option to true to use proposed API"
                );
            }
            get onBell() {
              return this._core.onBell;
            }
            get onBinary() {
              return this._core.onBinary;
            }
            get onCursorMove() {
              return this._core.onCursorMove;
            }
            get onData() {
              return this._core.onData;
            }
            get onKey() {
              return this._core.onKey;
            }
            get onLineFeed() {
              return this._core.onLineFeed;
            }
            get onRender() {
              return this._core.onRender;
            }
            get onResize() {
              return this._core.onResize;
            }
            get onScroll() {
              return this._core.onScroll;
            }
            get onSelectionChange() {
              return this._core.onSelectionChange;
            }
            get onTitleChange() {
              return this._core.onTitleChange;
            }
            get onWriteParsed() {
              return this._core.onWriteParsed;
            }
            get element() {
              return this._core.element;
            }
            get parser() {
              return (
                this._parser || (this._parser = new J.ParserApi(this._core)),
                this._parser
              );
            }
            get unicode() {
              return this._checkProposedApi(), new N.UnicodeApi(this._core);
            }
            get textarea() {
              return this._core.textarea;
            }
            get rows() {
              return this._core.rows;
            }
            get cols() {
              return this._core.cols;
            }
            get buffer() {
              return (
                this._buffer ||
                  (this._buffer = this.register(
                    new q.BufferNamespaceApi(this._core)
                  )),
                this._buffer
              );
            }
            get markers() {
              return this._checkProposedApi(), this._core.markers;
            }
            get modes() {
              let Q = this._core.coreService.decPrivateModes,
                W = "none";
              switch (this._core.coreMouseService.activeProtocol) {
                case "X10":
                  W = "x10";
                  break;
                case "VT200":
                  W = "vt200";
                  break;
                case "DRAG":
                  W = "drag";
                  break;
                case "ANY":
                  W = "any";
              }
              return {
                applicationCursorKeysMode: Q.applicationCursorKeys,
                applicationKeypadMode: Q.applicationKeypad,
                bracketedPasteMode: Q.bracketedPasteMode,
                insertMode: this._core.coreService.modes.insertMode,
                mouseTrackingMode: W,
                originMode: Q.origin,
                reverseWraparoundMode: Q.reverseWraparound,
                sendFocusMode: Q.sendFocus,
                wraparoundMode: Q.wraparound,
              };
            }
            get options() {
              return this._publicOptions;
            }
            set options(Q) {
              for (let W in Q) this._publicOptions[W] = Q[W];
            }
            blur() {
              this._core.blur();
            }
            focus() {
              this._core.focus();
            }
            resize(Q, W) {
              this._verifyIntegers(Q, W), this._core.resize(Q, W);
            }
            open(Q) {
              this._core.open(Q);
            }
            attachCustomKeyEventHandler(Q) {
              this._core.attachCustomKeyEventHandler(Q);
            }
            registerLinkProvider(Q) {
              return this._core.registerLinkProvider(Q);
            }
            registerCharacterJoiner(Q) {
              return (
                this._checkProposedApi(), this._core.registerCharacterJoiner(Q)
              );
            }
            deregisterCharacterJoiner(Q) {
              this._checkProposedApi(), this._core.deregisterCharacterJoiner(Q);
            }
            registerMarker(Q = 0) {
              return this._verifyIntegers(Q), this._core.registerMarker(Q);
            }
            registerDecoration(Q) {
              var W, Z, Y;
              return (
                this._checkProposedApi(),
                this._verifyPositiveIntegers(
                  (W = Q.x) !== null && W !== void 0 ? W : 0,
                  (Z = Q.width) !== null && Z !== void 0 ? Z : 0,
                  (Y = Q.height) !== null && Y !== void 0 ? Y : 0
                ),
                this._core.registerDecoration(Q)
              );
            }
            hasSelection() {
              return this._core.hasSelection();
            }
            select(Q, W, Z) {
              this._verifyIntegers(Q, W, Z), this._core.select(Q, W, Z);
            }
            getSelection() {
              return this._core.getSelection();
            }
            getSelectionPosition() {
              return this._core.getSelectionPosition();
            }
            clearSelection() {
              this._core.clearSelection();
            }
            selectAll() {
              this._core.selectAll();
            }
            selectLines(Q, W) {
              this._verifyIntegers(Q, W), this._core.selectLines(Q, W);
            }
            dispose() {
              super.dispose();
            }
            scrollLines(Q) {
              this._verifyIntegers(Q), this._core.scrollLines(Q);
            }
            scrollPages(Q) {
              this._verifyIntegers(Q), this._core.scrollPages(Q);
            }
            scrollToTop() {
              this._core.scrollToTop();
            }
            scrollToBottom() {
              this._core.scrollToBottom();
            }
            scrollToLine(Q) {
              this._verifyIntegers(Q), this._core.scrollToLine(Q);
            }
            clear() {
              this._core.clear();
            }
            write(Q, W) {
              this._core.write(Q, W);
            }
            writeln(Q, W) {
              this._core.write(Q),
                this._core.write(
                  `\r
`,
                  W
                );
            }
            paste(Q) {
              this._core.paste(Q);
            }
            refresh(Q, W) {
              this._verifyIntegers(Q, W), this._core.refresh(Q, W);
            }
            reset() {
              this._core.reset();
            }
            clearTextureAtlas() {
              this._core.clearTextureAtlas();
            }
            loadAddon(Q) {
              this._addonManager.loadAddon(this, Q);
            }
            static get strings() {
              return H;
            }
            _verifyIntegers(...Q) {
              for (let W of Q)
                if (W === 1 / 0 || isNaN(W) || W % 1 != 0)
                  throw Error("This API only accepts integers");
            }
            _verifyPositiveIntegers(...Q) {
              for (let W of Q)
                if (W && (W === 1 / 0 || isNaN(W) || W % 1 != 0 || W < 0))
                  throw Error("This API only accepts positive integers");
            }
          }
          M.Terminal = G;
        })(),
        n
      );
    })()
  );
});
var CQ = PQ((VQ, DQ) => {
  (function (_, u) {
    typeof VQ == "object" && typeof DQ == "object"
      ? (DQ.exports = u())
      : typeof define == "function" && define.amd
        ? define([], u)
        : typeof VQ == "object"
          ? (VQ.FitAddon = u())
          : (_.FitAddon = u());
  })(self, () =>
    (() => {
      var _ = {};
      return (
        (() => {
          var u = _;
          Object.defineProperty(u, "__esModule", { value: !0 }),
            (u.FitAddon = void 0),
            (u.FitAddon = class {
              activate(c) {
                this._terminal = c;
              }
              dispose() {}
              fit() {
                let c = this.proposeDimensions();
                if (!c || !this._terminal || isNaN(c.cols) || isNaN(c.rows))
                  return;
                let n = this._terminal._core;
                (this._terminal.rows === c.rows &&
                  this._terminal.cols === c.cols) ||
                  (n._renderService.clear(),
                  this._terminal.resize(c.cols, c.rows));
              }
              proposeDimensions() {
                if (!this._terminal) return;
                if (
                  !this._terminal.element ||
                  !this._terminal.element.parentElement
                )
                  return;
                let c = this._terminal._core,
                  n = c._renderService.dimensions;
                if (n.css.cell.width === 0 || n.css.cell.height === 0) return;
                let M =
                    this._terminal.options.scrollback === 0
                      ? 0
                      : c.viewport.scrollBarWidth,
                  H = window.getComputedStyle(
                    this._terminal.element.parentElement
                  ),
                  K = parseInt(H.getPropertyValue("height")),
                  P = Math.max(0, parseInt(H.getPropertyValue("width"))),
                  V = window.getComputedStyle(this._terminal.element),
                  q =
                    K -
                    (parseInt(V.getPropertyValue("padding-top")) +
                      parseInt(V.getPropertyValue("padding-bottom"))),
                  J =
                    P -
                    (parseInt(V.getPropertyValue("padding-right")) +
                      parseInt(V.getPropertyValue("padding-left"))) -
                    M;
                return {
                  cols: Math.max(2, Math.floor(J / n.css.cell.width)),
                  rows: Math.max(1, Math.floor(q / n.css.cell.height)),
                };
              }
            });
        })(),
        _
      );
    })()
  );
});
var SQ = PQ((NQ, LQ) => {
  (function (_, u) {
    typeof NQ == "object" && typeof LQ == "object"
      ? (LQ.exports = u())
      : typeof define == "function" && define.amd
        ? define([], u)
        : typeof NQ == "object"
          ? (NQ.WebLinksAddon = u())
          : (_.WebLinksAddon = u());
  })(self, () =>
    (() => {
      var _ = {
          6: (M, H) => {
            function K(V) {
              try {
                let q = new URL(V),
                  J =
                    q.password && q.username
                      ? `${q.protocol}//${q.username}:${q.password}@${q.host}`
                      : q.username
                        ? `${q.protocol}//${q.username}@${q.host}`
                        : `${q.protocol}//${q.host}`;
                return V.toLocaleLowerCase().startsWith(J.toLocaleLowerCase());
              } catch (q) {
                return !1;
              }
            }
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.LinkComputer = H.WebLinkProvider = void 0),
              (H.WebLinkProvider = class {
                constructor(V, q, J, N = {}) {
                  (this._terminal = V),
                    (this._regex = q),
                    (this._handler = J),
                    (this._options = N);
                }
                provideLinks(V, q) {
                  let J = P.computeLink(
                    V,
                    this._regex,
                    this._terminal,
                    this._handler
                  );
                  q(this._addCallbacks(J));
                }
                _addCallbacks(V) {
                  return V.map(
                    (q) => (
                      (q.leave = this._options.leave),
                      (q.hover = (J, N) => {
                        if (this._options.hover) {
                          let { range: X } = q;
                          this._options.hover(J, N, X);
                        }
                      }),
                      q
                    )
                  );
                }
              });
            class P {
              static computeLink(V, q, J, N) {
                let X = new RegExp(q.source, (q.flags || "") + "g"),
                  [G, Q] = P._getWindowedLineStrings(V - 1, J),
                  W = G.join(""),
                  Z,
                  Y = [];
                for (; (Z = X.exec(W)); ) {
                  let F = Z[0];
                  if (!K(F)) continue;
                  let [j, $] = P._mapStrIdx(J, Q, 0, Z.index),
                    [E, U] = P._mapStrIdx(J, j, $, F.length);
                  if (j === -1 || $ === -1 || E === -1 || U === -1) continue;
                  let z = {
                    start: { x: $ + 1, y: j + 1 },
                    end: { x: U, y: E + 1 },
                  };
                  Y.push({ range: z, text: F, activate: N });
                }
                return Y;
              }
              static _getWindowedLineStrings(V, q) {
                let J,
                  N = V,
                  X = V,
                  G = 0,
                  Q = "",
                  W = [];
                if ((J = q.buffer.active.getLine(V))) {
                  let Z = J.translateToString(!0);
                  if (J.isWrapped && Z[0] !== " ") {
                    for (
                      G = 0;
                      (J = q.buffer.active.getLine(--N)) &&
                      G < 2048 &&
                      ((Q = J.translateToString(!0)),
                      (G += Q.length),
                      W.push(Q),
                      J.isWrapped && Q.indexOf(" ") === -1);
                    );
                    W.reverse();
                  }
                  for (
                    W.push(Z), G = 0;
                    (J = q.buffer.active.getLine(++X)) &&
                    J.isWrapped &&
                    G < 2048 &&
                    ((Q = J.translateToString(!0)),
                    (G += Q.length),
                    W.push(Q),
                    Q.indexOf(" ") === -1);
                  );
                }
                return [W, N];
              }
              static _mapStrIdx(V, q, J, N) {
                let X = V.buffer.active,
                  G = X.getNullCell(),
                  Q = J;
                for (; N; ) {
                  let W = X.getLine(q);
                  if (!W) return [-1, -1];
                  for (let Z = Q; Z < W.length; ++Z) {
                    W.getCell(Z, G);
                    let Y = G.getChars();
                    if (
                      G.getWidth() &&
                      ((N -= Y.length || 1), Z === W.length - 1 && Y === "")
                    ) {
                      let F = X.getLine(q + 1);
                      F &&
                        F.isWrapped &&
                        (F.getCell(0, G), G.getWidth() === 2 && (N += 1));
                    }
                    if (N < 0) return [q, Z];
                  }
                  q++, (Q = 0);
                }
                return [q, Q];
              }
            }
            H.LinkComputer = P;
          },
        },
        u = {};
      function c(M) {
        var H = u[M];
        if (H !== void 0) return H.exports;
        var K = (u[M] = { exports: {} });
        return _[M](K, K.exports, c), K.exports;
      }
      var n = {};
      return (
        (() => {
          var M = n;
          Object.defineProperty(M, "__esModule", { value: !0 }),
            (M.WebLinksAddon = void 0);
          let H = c(6),
            K =
              /(https?|HTTPS?):[/]{2}[^\s"'!*(){}|\\\^<>`]*[^\s"':,.!?{}|\\\^~\[\]`()<>]/;
          function P(V, q) {
            let J = window.open();
            if (J) {
              try {
                J.opener = null;
              } catch {}
              J.location.href = q;
            } else
              console.warn(
                "Opening link blocked as opener could not be cleared"
              );
          }
          M.WebLinksAddon = class {
            constructor(V = P, q = {}) {
              (this._handler = V), (this._options = q);
            }
            activate(V) {
              this._terminal = V;
              let q = this._options,
                J = q.urlRegex || K;
              this._linkProvider = this._terminal.registerLinkProvider(
                new H.WebLinkProvider(this._terminal, J, this._handler, q)
              );
            }
            dispose() {
              this._linkProvider?.dispose();
            }
          };
        })(),
        n
      );
    })()
  );
});
var vQ = PQ((XQ, OQ) => {
  (function (_, u) {
    typeof XQ == "object" && typeof OQ == "object"
      ? (OQ.exports = u())
      : typeof define == "function" && define.amd
        ? define([], u)
        : typeof XQ == "object"
          ? (XQ.SearchAddon = u())
          : (_.SearchAddon = u());
  })(self, () =>
    (() => {
      var _ = {
          345: (M, H) => {
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.runAndSubscribe = H.forwardEvent = H.EventEmitter = void 0),
              (H.EventEmitter = class {
                constructor() {
                  (this._listeners = []), (this._disposed = !1);
                }
                get event() {
                  return (
                    this._event ||
                      (this._event = (K) => (
                        this._listeners.push(K),
                        {
                          dispose: () => {
                            if (!this._disposed) {
                              for (let P = 0; P < this._listeners.length; P++)
                                if (this._listeners[P] === K)
                                  return void this._listeners.splice(P, 1);
                            }
                          },
                        }
                      )),
                    this._event
                  );
                }
                fire(K, P) {
                  let V = [];
                  for (let q = 0; q < this._listeners.length; q++)
                    V.push(this._listeners[q]);
                  for (let q = 0; q < V.length; q++) V[q].call(void 0, K, P);
                }
                dispose() {
                  this.clearListeners(), (this._disposed = !0);
                }
                clearListeners() {
                  this._listeners && (this._listeners.length = 0);
                }
              }),
              (H.forwardEvent = function (K, P) {
                return K((V) => P.fire(V));
              }),
              (H.runAndSubscribe = function (K, P) {
                return P(void 0), K((V) => P(V));
              });
          },
          859: (M, H) => {
            function K(P) {
              for (let V of P) V.dispose();
              P.length = 0;
            }
            Object.defineProperty(H, "__esModule", { value: !0 }),
              (H.getDisposeArrayDisposable =
                H.disposeArray =
                H.toDisposable =
                H.MutableDisposable =
                H.Disposable =
                  void 0),
              (H.Disposable = class {
                constructor() {
                  (this._disposables = []), (this._isDisposed = !1);
                }
                dispose() {
                  this._isDisposed = !0;
                  for (let P of this._disposables) P.dispose();
                  this._disposables.length = 0;
                }
                register(P) {
                  return this._disposables.push(P), P;
                }
                unregister(P) {
                  let V = this._disposables.indexOf(P);
                  V !== -1 && this._disposables.splice(V, 1);
                }
              }),
              (H.MutableDisposable = class {
                constructor() {
                  this._isDisposed = !1;
                }
                get value() {
                  return this._isDisposed ? void 0 : this._value;
                }
                set value(P) {
                  this._isDisposed ||
                    P === this._value ||
                    (this._value?.dispose(), (this._value = P));
                }
                clear() {
                  this.value = void 0;
                }
                dispose() {
                  (this._isDisposed = !0),
                    this._value?.dispose(),
                    (this._value = void 0);
                }
              }),
              (H.toDisposable = function (P) {
                return { dispose: P };
              }),
              (H.disposeArray = K),
              (H.getDisposeArrayDisposable = function (P) {
                return { dispose: () => K(P) };
              });
          },
        },
        u = {};
      function c(M) {
        var H = u[M];
        if (H !== void 0) return H.exports;
        var K = (u[M] = { exports: {} });
        return _[M](K, K.exports, c), K.exports;
      }
      var n = {};
      return (
        (() => {
          var M = n;
          Object.defineProperty(M, "__esModule", { value: !0 }),
            (M.SearchAddon = void 0);
          let H = c(345),
            K = c(859),
            P = " ~!@#$%^&*()+`-=[]{}|\\;:\"',./<>?";
          class V extends K.Disposable {
            constructor(q) {
              super(),
                (this._highlightedLines = new Set()),
                (this._highlightDecorations = []),
                (this._selectedDecoration = this.register(
                  new K.MutableDisposable()
                )),
                (this._linesCacheTimeoutId = 0),
                (this._linesCacheDisposables = new K.MutableDisposable()),
                (this._onDidChangeResults = this.register(
                  new H.EventEmitter()
                )),
                (this.onDidChangeResults = this._onDidChangeResults.event),
                (this._highlightLimit = q?.highlightLimit ?? 1000);
            }
            activate(q) {
              (this._terminal = q),
                this.register(
                  this._terminal.onWriteParsed(() => this._updateMatches())
                ),
                this.register(
                  this._terminal.onResize(() => this._updateMatches())
                ),
                this.register(
                  (0, K.toDisposable)(() => this.clearDecorations())
                );
            }
            _updateMatches() {
              this._highlightTimeout &&
                window.clearTimeout(this._highlightTimeout),
                this._cachedSearchTerm &&
                  this._lastSearchOptions?.decorations &&
                  (this._highlightTimeout = setTimeout(() => {
                    let q = this._cachedSearchTerm;
                    (this._cachedSearchTerm = void 0),
                      this.findPrevious(q, {
                        ...this._lastSearchOptions,
                        incremental: !0,
                        noScroll: !0,
                      });
                  }, 200));
            }
            clearDecorations(q) {
              this._selectedDecoration.clear(),
                (0, K.disposeArray)(this._highlightDecorations),
                (this._highlightDecorations = []),
                this._highlightedLines.clear(),
                q || (this._cachedSearchTerm = void 0);
            }
            clearActiveDecoration() {
              this._selectedDecoration.clear();
            }
            findNext(q, J) {
              if (!this._terminal)
                throw Error("Cannot use addon until it has been loaded");
              let N =
                !this._lastSearchOptions ||
                this._didOptionsChange(this._lastSearchOptions, J);
              (this._lastSearchOptions = J),
                J?.decorations &&
                  (this._cachedSearchTerm === void 0 ||
                    q !== this._cachedSearchTerm ||
                    N) &&
                  this._highlightAllMatches(q, J);
              let X = this._findNextAndSelect(q, J);
              return this._fireResults(J), (this._cachedSearchTerm = q), X;
            }
            _highlightAllMatches(q, J) {
              if (!this._terminal)
                throw Error("Cannot use addon until it has been loaded");
              if (!q || q.length === 0) return void this.clearDecorations();
              (J = J || {}), this.clearDecorations(!0);
              let N = [],
                X,
                G = this._find(q, 0, 0, J);
              for (
                ;
                G &&
                (X?.row !== G.row || X?.col !== G.col) &&
                !(N.length >= this._highlightLimit);
              )
                (X = G),
                  N.push(X),
                  (G = this._find(
                    q,
                    X.col + X.term.length >= this._terminal.cols
                      ? X.row + 1
                      : X.row,
                    X.col + X.term.length >= this._terminal.cols
                      ? 0
                      : X.col + 1,
                    J
                  ));
              for (let Q of N) {
                let W = this._createResultDecoration(Q, J.decorations);
                W &&
                  (this._highlightedLines.add(W.marker.line),
                  this._highlightDecorations.push({
                    decoration: W,
                    match: Q,
                    dispose() {
                      W.dispose();
                    },
                  }));
              }
            }
            _find(q, J, N, X) {
              if (!this._terminal || !q || q.length === 0)
                return (
                  this._terminal?.clearSelection(), void this.clearDecorations()
                );
              if (N > this._terminal.cols)
                throw Error(
                  `Invalid col: ${N} to search in terminal of ${this._terminal.cols} cols`
                );
              let G;
              this._initLinesCache();
              let Q = { startRow: J, startCol: N };
              if (((G = this._findInLine(q, Q, X)), !G))
                for (
                  let W = J + 1;
                  W <
                    this._terminal.buffer.active.baseY + this._terminal.rows &&
                  ((Q.startRow = W),
                  (Q.startCol = 0),
                  (G = this._findInLine(q, Q, X)),
                  !G);
                  W++
                );
              return G;
            }
            _findNextAndSelect(q, J) {
              if (!this._terminal || !q || q.length === 0)
                return (
                  this._terminal?.clearSelection(), this.clearDecorations(), !1
                );
              let N = this._terminal.getSelectionPosition();
              this._terminal.clearSelection();
              let X = 0,
                G = 0;
              N &&
                (this._cachedSearchTerm === q
                  ? ((X = N.end.x), (G = N.end.y))
                  : ((X = N.start.x), (G = N.start.y))),
                this._initLinesCache();
              let Q = { startRow: G, startCol: X },
                W = this._findInLine(q, Q, J);
              if (!W)
                for (
                  let Z = G + 1;
                  Z <
                    this._terminal.buffer.active.baseY + this._terminal.rows &&
                  ((Q.startRow = Z),
                  (Q.startCol = 0),
                  (W = this._findInLine(q, Q, J)),
                  !W);
                  Z++
                );
              if (!W && G !== 0)
                for (
                  let Z = 0;
                  Z < G &&
                  ((Q.startRow = Z),
                  (Q.startCol = 0),
                  (W = this._findInLine(q, Q, J)),
                  !W);
                  Z++
                );
              return (
                !W &&
                  N &&
                  ((Q.startRow = N.start.y),
                  (Q.startCol = 0),
                  (W = this._findInLine(q, Q, J))),
                this._selectResult(W, J?.decorations, J?.noScroll)
              );
            }
            findPrevious(q, J) {
              if (!this._terminal)
                throw Error("Cannot use addon until it has been loaded");
              let N =
                !this._lastSearchOptions ||
                this._didOptionsChange(this._lastSearchOptions, J);
              (this._lastSearchOptions = J),
                J?.decorations &&
                  (this._cachedSearchTerm === void 0 ||
                    q !== this._cachedSearchTerm ||
                    N) &&
                  this._highlightAllMatches(q, J);
              let X = this._findPreviousAndSelect(q, J);
              return this._fireResults(J), (this._cachedSearchTerm = q), X;
            }
            _didOptionsChange(q, J) {
              return (
                !!J &&
                (q.caseSensitive !== J.caseSensitive ||
                  q.regex !== J.regex ||
                  q.wholeWord !== J.wholeWord)
              );
            }
            _fireResults(q) {
              if (q?.decorations) {
                let J = -1;
                if (this._selectedDecoration.value) {
                  let N = this._selectedDecoration.value.match;
                  for (let X = 0; X < this._highlightDecorations.length; X++) {
                    let G = this._highlightDecorations[X].match;
                    if (
                      G.row === N.row &&
                      G.col === N.col &&
                      G.size === N.size
                    ) {
                      J = X;
                      break;
                    }
                  }
                }
                this._onDidChangeResults.fire({
                  resultIndex: J,
                  resultCount: this._highlightDecorations.length,
                });
              }
            }
            _findPreviousAndSelect(q, J) {
              if (!this._terminal)
                throw Error("Cannot use addon until it has been loaded");
              if (!this._terminal || !q || q.length === 0)
                return (
                  this._terminal?.clearSelection(), this.clearDecorations(), !1
                );
              let N = this._terminal.getSelectionPosition();
              this._terminal.clearSelection();
              let X =
                  this._terminal.buffer.active.baseY + this._terminal.rows - 1,
                G = this._terminal.cols,
                Q = !0;
              this._initLinesCache();
              let W = { startRow: X, startCol: G },
                Z;
              if (
                (N &&
                  ((W.startRow = X = N.start.y),
                  (W.startCol = G = N.start.x),
                  this._cachedSearchTerm !== q &&
                    ((Z = this._findInLine(q, W, J, !1)),
                    Z ||
                      ((W.startRow = X = N.end.y),
                      (W.startCol = G = N.end.x)))),
                Z || (Z = this._findInLine(q, W, J, Q)),
                !Z)
              ) {
                W.startCol = Math.max(W.startCol, this._terminal.cols);
                for (
                  let Y = X - 1;
                  Y >= 0 &&
                  ((W.startRow = Y), (Z = this._findInLine(q, W, J, Q)), !Z);
                  Y--
                );
              }
              if (
                !Z &&
                X !==
                  this._terminal.buffer.active.baseY + this._terminal.rows - 1
              )
                for (
                  let Y =
                    this._terminal.buffer.active.baseY +
                    this._terminal.rows -
                    1;
                  Y >= X &&
                  ((W.startRow = Y), (Z = this._findInLine(q, W, J, Q)), !Z);
                  Y--
                );
              return this._selectResult(Z, J?.decorations, J?.noScroll);
            }
            _initLinesCache() {
              let q = this._terminal;
              this._linesCache ||
                ((this._linesCache = Array(q.buffer.active.length)),
                (this._linesCacheDisposables.value = (0,
                K.getDisposeArrayDisposable)([
                  q.onLineFeed(() => this._destroyLinesCache()),
                  q.onCursorMove(() => this._destroyLinesCache()),
                  q.onResize(() => this._destroyLinesCache()),
                ]))),
                window.clearTimeout(this._linesCacheTimeoutId),
                (this._linesCacheTimeoutId = window.setTimeout(
                  () => this._destroyLinesCache(),
                  15000
                ));
            }
            _destroyLinesCache() {
              (this._linesCache = void 0),
                this._linesCacheDisposables.clear(),
                this._linesCacheTimeoutId &&
                  (window.clearTimeout(this._linesCacheTimeoutId),
                  (this._linesCacheTimeoutId = 0));
            }
            _isWholeWord(q, J, N) {
              return (
                (q === 0 || P.includes(J[q - 1])) &&
                (q + N.length === J.length || P.includes(J[q + N.length]))
              );
            }
            _findInLine(q, J, N = {}, X = !1) {
              let G = this._terminal,
                Q = J.startRow,
                W = J.startCol;
              if (G.buffer.active.getLine(Q)?.isWrapped)
                return X
                  ? void (J.startCol += G.cols)
                  : (J.startRow--,
                    (J.startCol += G.cols),
                    this._findInLine(q, J, N));
              let Y = this._linesCache?.[Q];
              Y ||
                ((Y = this._translateBufferLineToStringWithWrap(Q, !0)),
                this._linesCache && (this._linesCache[Q] = Y));
              let [F, j] = Y,
                $ = this._bufferColsToStringOffset(Q, W),
                E = N.caseSensitive ? q : q.toLowerCase(),
                U = N.caseSensitive ? F : F.toLowerCase(),
                z = -1;
              if (N.regex) {
                let k = RegExp(E, "g"),
                  O;
                if (X)
                  for (; (O = k.exec(U.slice(0, $))); )
                    (z = k.lastIndex - O[0].length),
                      (q = O[0]),
                      (k.lastIndex -= q.length - 1);
                else
                  (O = k.exec(U.slice($))),
                    O &&
                      O[0].length > 0 &&
                      ((z = $ + (k.lastIndex - O[0].length)), (q = O[0]));
              } else
                X
                  ? $ - E.length >= 0 && (z = U.lastIndexOf(E, $ - E.length))
                  : (z = U.indexOf(E, $));
              if (z >= 0) {
                if (N.wholeWord && !this._isWholeWord(z, U, q)) return;
                let k = 0;
                for (; k < j.length - 1 && z >= j[k + 1]; ) k++;
                let O = k;
                for (; O < j.length - 1 && z + q.length >= j[O + 1]; ) O++;
                let L = z - j[k],
                  b = z + q.length - j[O],
                  B = this._stringLengthToBufferSize(Q + k, L);
                return {
                  term: q,
                  col: B,
                  row: Q + k,
                  size:
                    this._stringLengthToBufferSize(Q + O, b) -
                    B +
                    G.cols * (O - k),
                };
              }
            }
            _stringLengthToBufferSize(q, J) {
              let N = this._terminal.buffer.active.getLine(q);
              if (!N) return 0;
              for (let X = 0; X < J; X++) {
                let G = N.getCell(X);
                if (!G) break;
                let Q = G.getChars();
                Q.length > 1 && (J -= Q.length - 1);
                let W = N.getCell(X + 1);
                W && W.getWidth() === 0 && J++;
              }
              return J;
            }
            _bufferColsToStringOffset(q, J) {
              let N = this._terminal,
                X = q,
                G = 0,
                Q = N.buffer.active.getLine(X);
              for (; J > 0 && Q; ) {
                for (let W = 0; W < J && W < N.cols; W++) {
                  let Z = Q.getCell(W);
                  if (!Z) break;
                  Z.getWidth() &&
                    (G += Z.getCode() === 0 ? 1 : Z.getChars().length);
                }
                if ((X++, (Q = N.buffer.active.getLine(X)), Q && !Q.isWrapped))
                  break;
                J -= N.cols;
              }
              return G;
            }
            _translateBufferLineToStringWithWrap(q, J) {
              let N = this._terminal,
                X = [],
                G = [0],
                Q = N.buffer.active.getLine(q);
              for (; Q; ) {
                let W = N.buffer.active.getLine(q + 1),
                  Z = !!W && W.isWrapped,
                  Y = Q.translateToString(!Z && J);
                if (Z && W) {
                  let F = Q.getCell(Q.length - 1);
                  F &&
                    F.getCode() === 0 &&
                    F.getWidth() === 1 &&
                    W.getCell(0)?.getWidth() === 2 &&
                    (Y = Y.slice(0, -1));
                }
                if ((X.push(Y), !Z)) break;
                G.push(G[G.length - 1] + Y.length), q++, (Q = W);
              }
              return [X.join(""), G];
            }
            _selectResult(q, J, N) {
              let X = this._terminal;
              if ((this._selectedDecoration.clear(), !q))
                return X.clearSelection(), !1;
              if ((X.select(q.col, q.row, q.size), J)) {
                let G = X.registerMarker(
                  -X.buffer.active.baseY - X.buffer.active.cursorY + q.row
                );
                if (G) {
                  let Q = X.registerDecoration({
                    marker: G,
                    x: q.col,
                    width: q.size,
                    backgroundColor: J.activeMatchBackground,
                    layer: "top",
                    overviewRulerOptions: {
                      color: J.activeMatchColorOverviewRuler,
                    },
                  });
                  if (Q) {
                    let W = [];
                    W.push(G),
                      W.push(
                        Q.onRender((Z) =>
                          this._applyStyles(Z, J.activeMatchBorder, !0)
                        )
                      ),
                      W.push(Q.onDispose(() => (0, K.disposeArray)(W))),
                      (this._selectedDecoration.value = {
                        decoration: Q,
                        match: q,
                        dispose() {
                          Q.dispose();
                        },
                      });
                  }
                }
              }
              if (
                !N &&
                (q.row >= X.buffer.active.viewportY + X.rows ||
                  q.row < X.buffer.active.viewportY)
              ) {
                let G = q.row - X.buffer.active.viewportY;
                (G -= Math.floor(X.rows / 2)), X.scrollLines(G);
              }
              return !0;
            }
            _applyStyles(q, J, N) {
              q.classList.contains("xterm-find-result-decoration") ||
                (q.classList.add("xterm-find-result-decoration"),
                J && (q.style.outline = `1px solid ${J}`)),
                N && q.classList.add("xterm-find-active-result-decoration");
            }
            _createResultDecoration(q, J) {
              let N = this._terminal,
                X = N.registerMarker(
                  -N.buffer.active.baseY - N.buffer.active.cursorY + q.row
                );
              if (!X) return;
              let G = N.registerDecoration({
                marker: X,
                x: q.col,
                width: q.size,
                backgroundColor: J.matchBackground,
                overviewRulerOptions: this._highlightedLines.has(X.line)
                  ? void 0
                  : { color: J.matchOverviewRuler, position: "center" },
              });
              if (G) {
                let Q = [];
                Q.push(X),
                  Q.push(
                    G.onRender((W) => this._applyStyles(W, J.matchBorder, !1))
                  ),
                  Q.push(G.onDispose(() => (0, K.disposeArray)(Q)));
              }
              return G;
            }
          }
          M.SearchAddon = V;
        })(),
        n
      );
    })()
  );
});
var mQ = FQ(gQ(), 1),
  fQ = FQ(CQ(), 1),
  pQ = FQ(SQ(), 1),
  _Q = FQ(vQ(), 1),
  uQ = 0,
  IQ = [1000, 2000, 4000, 8000, 16000, 30000],
  rQ = document.getElementById("status-project"),
  wQ = document.getElementById("status-indicator"),
  sQ = document.getElementById("terminal-container"),
  t = new mQ.Terminal({
    fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
    fontSize: 14,
    theme: {
      background: "#1a1a1a",
      foreground: "#e0e0e0",
      cursor: "#e0e0e0",
      cursorAccent: "#1a1a1a",
      selectionBackground: "rgba(96, 165, 250, 0.3)",
      black: "#1a1a1a",
      red: "#f87171",
      green: "#4ade80",
      yellow: "#fbbf24",
      blue: "#60a5fa",
      magenta: "#c084fc",
      cyan: "#22d3ee",
      white: "#e0e0e0",
      brightBlack: "#666666",
      brightRed: "#fca5a5",
      brightGreen: "#86efac",
      brightYellow: "#fde68a",
      brightBlue: "#93c5fd",
      brightMagenta: "#d8b4fe",
      brightCyan: "#67e8f9",
      brightWhite: "#ffffff",
    },
    cursorBlink: !0,
    allowProposedApi: !0,
    scrollback: 1e4,
  }),
  BQ = new fQ.FitAddon(),
  iQ = new pQ.WebLinksAddon(),
  tQ = new _Q.SearchAddon();
t.loadAddon(BQ);
t.loadAddon(iQ);
t.loadAddon(tQ);
t.open(sQ);
BQ.fit();
var e = null,
  bQ = 0,
  yQ = null;
function xQ(_) {
  (wQ.className = `status-${_}`),
    (wQ.textContent =
      _ === "connected"
        ? "Connected"
        : _ === "reconnecting"
          ? "Reconnecting..."
          : "Disconnected");
}
function cQ(_) {
  if (e?.readyState === WebSocket.OPEN) {
    let u = new Uint8Array(_.length + 1);
    u[0] = uQ;
    for (let c = 0; c < _.length; c++) u[c + 1] = _.charCodeAt(c);
    e.send(u);
  }
}
function lQ() {
  let _ = window.location.protocol === "https:" ? "wss:" : "ws:",
    c = new URLSearchParams(window.location.search).get("token"),
    n = c
      ? `${_}//${window.location.host}/ws?token=${c}`
      : `${_}//${window.location.host}/ws`;
  (e = new WebSocket(n)),
    (e.binaryType = "arraybuffer"),
    (e.onopen = () => {
      xQ("connected"), (bQ = 0), cQ(`resize:${t.cols}:${t.rows}`);
    }),
    (e.onmessage = (M) => {
      let H = M.data;
      if (H instanceof ArrayBuffer) {
        let K = new Uint8Array(H);
        if (K.length > 0 && K[0] === uQ) return;
        t.write(K);
      } else if (typeof H === "string") t.write(H);
    }),
    (e.onclose = () => {
      (e = null), xQ("reconnecting"), eQ();
    }),
    (e.onerror = () => {});
}
function eQ() {
  if (yQ) return;
  let _ = IQ[Math.min(bQ, IQ.length - 1)];
  bQ++,
    (yQ = setTimeout(() => {
      (yQ = null), lQ();
    }, _));
}
t.onData((_) => {
  if (e?.readyState === WebSocket.OPEN) e.send(_);
});
t.onResize(({ cols: _, rows: u }) => {
  cQ(`resize:${_}:${u}`);
});
var AQ = null;
window.addEventListener("resize", () => {
  if (AQ) clearTimeout(AQ);
  AQ = setTimeout(() => {
    BQ.fit();
  }, 100);
});
t.onSelectionChange(() => {
  let _ = t.getSelection();
  if (_) navigator.clipboard.writeText(_).catch(() => {});
});
fetch("/api/status")
  .then((_) => _.json())
  .then((_) => {
    rQ.textContent = `OpenFarm ${_.version ?? ""} | ${_.project ?? ""}`;
  })
  .catch(() => {});
xQ("disconnected");
lQ();
