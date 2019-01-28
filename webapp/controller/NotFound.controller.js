sap.ui.define([
	"whr/com/br/ZLARBancoHorasGestor/controller/BaseController"
	], function (BaseController) {
		"use strict";

		return BaseController.extend("whr.com.br.ZLARBancoHorasGestor.controller.NotFound", {

			onInit: function () {
				this.getRouter().getTarget("notFound").attachDisplay(this._onNotFoundDisplayed, this);
			},

			_onNotFoundDisplayed : function () {
					this.getModel("appView").setProperty("/layout", "OneColumn");
			}
		});
	}
);