/*global location */
sap.ui.define([
	"whr/com/br/ZLARBancoHorasGestor/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"whr/com/br/ZLARBancoHorasGestor/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("whr.com.br.ZLARBancoHorasGestor.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0
			});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			this.setModel(oViewModel, "detailView");

			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));

			var globalModel = new sap.ui.model.json.JSONModel();
			globalModel.setData({
				tipo: 'A'
			});
			sap.ui.getCore().setModel(globalModel, 'global_tipo');
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onSendEmailPress: function () {
			var oViewModel = this.getModel("detailView");

			sap.m.URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent) {
			var sObjectId = oEvent.getParameter("arguments").objectId;
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getModel().metadataLoaded().then(function () {
				var sObjectPath = this.getModel().createKey("SUBORDINADOSSet", {
					Objid: sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange: function () {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getPath(),
				oResourceBundle = this.getResourceBundle(),
				oObject = oView.getModel().getObject(sPath),
				sObjectId = oObject.Otype,
				sObjectName = oObject.Stext,
				oViewModel = this.getModel("detailView");

			this.getOwnerComponent().oListSelector.selectAListItem(sPath);

			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
		},

		_onMetadataLoaded: function () {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView");

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		/**
		 * Set the full screen mode to false and navigate to master page
		 */
		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},
		onPesquisar: function () {

			try {

				var sServiceUrl = "/sap/opu/odata/SAP/ZLAR_TIMEWEB_SRV";
				// create OData model instance with service URL and JSON format
				var oModel = new sap.ui.model.odata.ODataModel(sServiceUrl, true);
				var globalTipo = sap.ui.getCore().getModel("global_tipo");

				var that = this;
				that.getView().setBusy(true);

				var Begda = this.getView().byId("DataInicio").getValue();
				var Endda = this.getView().byId("DataFim").getValue();
				var tipoID = globalTipo.oData.tipo;

				oModel.read("/BH_ANALITICOSet/?$filter=(Begda eq datetime'" + Begda + "T00:00:00' and Endda eq datetime'" + Endda +
					"T00:00:00' and Pernrlog eq '00100072' and Tprel eq '" + tipoID + "' and Langu eq 'P')",
					undefined,
					undefined,
					false,
					function _OnSuccess(oData, response) {
						var jSONModel = new sap.ui.model.json.JSONModel();

						jSONModel.setData(oData);
						that.getView().setModel(jSONModel, "worklistView");
					},
					function _OnError(oError) {}
				);

				//oModel.read("/CABECALHO_PERFILSet('1')", { success : (oData, response) => { debugger; } });

			} catch (ex) {}
			that.getView().setBusy(false);
		},

		onSelectTipo: function (oEvent) {
			var globalModel = new sap.ui.model.json.JSONModel();
			var tipoID;

			var oSelectedIndex = oEvent.getParameter("selectedIndex");

			var sHorasNormaisCol = this.getView().byId("HorasNormaisCol");
			var sHorasExtrasCol = this.getView().byId("HorasExtrasCol");
			var sQuantidade1Col = this.getView().byId("Quantidade1Col");
			var sAusenciaCol = this.getView().byId("AusenciaCol");
			var sQuantidade2Col = this.getView().byId("Quantidade2Col");

			if (oSelectedIndex == 0) {
				sHorasExtrasCol.setVisible(true);
				sHorasExtrasCol.setVisible(true);
				sQuantidade1Col.setVisible(true);
				sAusenciaCol.setVisible(true);
				sQuantidade2Col.setVisible(true);
				tipoID = "A";
			} else {
				sHorasExtrasCol.setVisible(false);
				sHorasExtrasCol.setVisible(false);
				sQuantidade1Col.setVisible(false);
				sAusenciaCol.setVisible(false);
				sQuantidade2Col.setVisible(false);
				tipoID = "S";
			}
			globalModel.setData({
				tipo: tipoID
			});
			sap.ui.getCore().setModel(globalModel, 'global_tipo');

		},

		/**
		 * Toggle between full and non full screen mode.
		 */
		toggleFullScreen: function () {
			var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
			}
		}
	});

});