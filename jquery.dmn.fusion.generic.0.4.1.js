// FusionDMN
// ver 0.4 beta
// A product of The Dallas Morning News
// FusionDMN is an AWESOME jQuery plugin for displaying Google Fusion Tables as
// searchable databases. It's open source under the very liberal MIT License
// If you use it, please email dlathrop@dallasnews.com so I know about it, and
//
// The original script was not a jQuery plugin but making it one seemed like the
// best way to make if more usable in the field.
//
// Version 0.4 now works with the documented Fusion Tables javascript API
//
// written by Daniel Lathrop <dlathrop@dallasnews.com>
// Copyright (c) 2012 The Dallas Morning News
// released under the terms of the MIT License:
// http://www.opensource.org/licenses/mit-license.php
//


//// uncomment following section to auto-load underscore.
//if ( window._ ) {
//     // if _.js is present do nothing
//} else {
//     
//     $.getScript( "underscore-min.js" );
//}

//// uncomment following section to auto-load jQuery.
//if (window.jQuery) {
//     // if jQuery is present do nothing
//} else {
//     // this is where the code to bootstrap jQuery could go if we put it in
//}



var headerInsert = "<script src='http://newsapps.dallasnews.com/media/jquery.tablesorter.min.js' type='text/javascript'></script><link type='text/css' href='http://newsapps.dallasnews.com/media/css/cupertino/jquery-ui-1.8.12.custom.css' rel='stylesheet' /><link href='http://newsapps.dallasnews.com/media/fusiondmn.generic.css' type='text/css' rel='stylesheet' />";

$('head').append(headerInsert);

(function( $ ){
     $.widget("dmn.fusiondmn", {
          options: {
             'apiKey'                   : undefined,
             'fusionTableId'            :     undefined,
             'detailsTableId'           : undefined, // if this is undefined it defaults to fusionTableId
             // which columns display in the results table
             'rowFields'               :     undefined,
             // This value is a 0-based index for the field on which to link to the details field
             'detailsField'           :   undefined, 
             // which columns are available for the details view
             'detailsViewFields'          :    "*",
             // array of search fields
             'searchFields'           :    undefined,
             'orderRowsBy'            :    "",
             
             // if resultsHeaders undefined use the column names from Google
             // otherwise an array of column headers in the same order as
             // results fields
             'resultsHeaders'         :    undefined,
             'headersTemplate'        :    '<thead><tr><%= headers %></tr></thead>',
             'detailsTitleTemplate'   :   '',
             'searchFieldTemplate'      :   '<tr style="border: 0px;"><td style="border: 0px;"><%= field %>:</td><td style="border: 0px;"><input type="search" class="fusionSearchField" id="fusionField<%= field %>" name="<%= field %>"></td></tr>',
             
             
             
             // if undefined use smart defaults, else should be an _.js template
             // or an array of _.js template strings
             'rowTemplate'            :    undefined,
             // if undefined use simple list of key,value pairs
             'detailsTemplate'        :    undefined,
             
             
             
             
             // allows you to specify jQuery UI or other stylesheet
             // helpful when using in embed code
             'cssUrl'                 :    undefined, 
             
             
             'loadingMessage'         :    "<strong>&nbsp;&nbsp;Loading ...</strong>",
             'noResultsMessage'       :    "<strong>&nbsp;&nbsp;No results</strong>",
             // changing the default widgetInnerHtml is usually a bad idea
             // if you do, make sure to preserve the proper element IDs
             // but doing so will also make your code brittle to implementation
             // changes since I don't promise not to change how the internals
             // work.
             '_widgetInnerHtml'         :   '<form id="fusionDataForm"><table id="fusionDataFormFields" style="border:0"></table><button id="fusionButtonSearch">Search</button><button id="fusionButtonAll">View all</button></form><div id="fusionDialog"><div id="fusionDialogText"></div></div><div id="fusionData"><p id="fusionMessage"></p><table id="fusionDataTable"></table></div>'
          },
          _create: function () {
               var self = this;
               var o = self.options;
               el = self.element;
               el.html(o._widgetInnerHtml);
               // if the cssUrl option was set, then we add it to the DOM.
               if ( o.cssUrl ) {
                    $('head').append('<link rel="stylesheet" href="' + settings.cssUrl + '" type="text/css" />'); //append the cssUrl setting to the head section         
               } else {
                 // do nothing if there is no cssUrl set.
                 // We assume that jQuery UI CSS already loaded.
               }
               if (o.fusionTableId) {
                    if (_.isNumber(o.fusionTableId)) {
                         // fusionTableId is probably valid
                    } else {
                        // int table ids now deprecated
                        // next version should have some kind of check
                        // throw "Invalid fusionTableId";
                    }
               } else {
                    throw "fusionTableId not set";
               }
               if (o.searchFields) {
                    if (_.isArray(o.searchFields)) {
                         // searchFields are probably valid
                    } else {
                         throw "Invalid searchFields";
                    }
               } else {
                    throw "searchFields not set";
               }
               if (!o.detailsTableId) {
                    o.detailsTableId = o.fusionTableId;
               }
               this._resetDataTable();
               this._setupSearchFieldTemplate();
               this._createSearchFields();
               this._setupSelectString();
               this._setupRowTemplate();
               this._setupDetailsSelectString();
               this._setupDetailsTemplate();
               this._setupDetailsTitleTemplate();
               this.clearLoadingMessage();
               $('#fusionButtonSearch').click(function () {
                    el.fusiondmn("queryTable", "query");
                    ////console.log("test search");

                    return false;
               });
               $('#fusionButtonAll').click(function () {
                    ////console.log("test all");
                    el.fusiondmn("queryTable", "all");
                    return false;
               });
               $('#fusionDialog').dialog( {
                    autoOpen: false,
                    modal: true,
                    width: 600
               });
               //this.queryTable();
               //alert('Fusion Table Instantiated!');
               
          },
          destroy: function () {
               this.element.html('');
               $.Widget.prototype.destroy.call(this);
          },
          _compileTemplates: function () {
               o = this.options;
               o.searchFieldsTemplate = _.template(o.searchFieldsTemplate);
               o.headersTemplate = _.template(o.headersTemplate);
               o.detailsTitleTemplate = _.template(o.detailsTitleTemplate);
          },
          _setOption: function() {
               // first we call the base _setOption functionality
               $.Widget.prototype._setOption.apply(this, arguments);
               this._resetDataTable();
               this._createSearchFields();
               this._setupRowTemplate();
               this._setupDetailsTemplate();
               this._clearLoadingMessage();
          },
          _resetDataTable: function () {
               //alert('a');
               //$("#fusionMessage").html('');
               $("#fusionDataTable").html('');
          },
          clearLoadingMessage: function () {
               var target = $("#fusionMessage");
               // stop doesn't seem to be strictly necessary but feels like it
               // should be.
               // target.stop(false, true);
               target.hide();
          },
          //showLoadingMessage: function () {
          //     var string = arguments[0];
          //     var self = this;
          //     //alert('b');
          //     var target = $("#fusionMessage");
          //     //target.show();
          //     if (string) {
          //          target.html(string);
          //          if (string.match(/loading/i)) {
          //               target.show().effect("pulsate", { times:10 }, 1000);
          //          } else {
          //               //target.stop(true, true);
          //               target.show();
          //          }
          //     } else {
          //          target.html(self.options.loadingMessage);
          //          target.show().effect("pulsate", { times:10 }, 1000);
          //     }
          //     
          //     
          //},
          showLoadingMessage: function () {
               string = arguments[0];
               var target = $("#fusionMessage");
               if (string) {
                    target.html(string);
                    if (string.match(/loading/i)) {
                         target.show();//.effect("pulsate", { times:100}, 1000);
                    } else {
                         target.show();
                    }
               } else {
                    target.html(this.options.loadingMessage);
                    target.show();//.effect("pulsate", { times:100}, 1000);
               }
               
               
          },
          _createSearchFields: function (template, fields) {
               o = this.options;
               $.each(o.searchFields, function (index, value) {
                    $('#fusionDataFormFields').append(o.searchFieldTemplate({'field': value}));
               });
          },
          _setupSelectString: function () {
               if (_.isUndefined(o.rowFields)) {
                    throw "Need to define row fields";
               }
               var selectString = ""
               if (_.isArray(o.rowFields)) {
                    selectString += _.map(o.rowFields, function (val) {return "'" + val + "'"}).join(', ');
                    //alert(selectString);
               } else if (_.isString(o.rowFields)) {
                    selectString += o.rowFields;
               } else {
                    throw "Error generating search function because of invalid options.rowFields";
               }
               //alert(selectString);
               o.rowFields = selectString;
          },
          _setupDetailsSelectString: function () {
               var selectString = "";
               if (_.isArray(o.detailsFields)) {
                    selectString += o.detailsFields.join(', ');
               } else if (_.isString(o.detailsFields)) {
                    selectString += o.detailsFields;
               } else {
                    throw "Error generating search function because of invalid options.detailsFields";
               }
               o.detailsFields = selectString;
          },
          _setupDetailsTitleTemplate: function () {
               o = this.options;
               o.detailsTitleTemplate = _.template(o.detailsTitleTemplate);
          },
          _setupRowTemplate: function () {
               o = this.options;
               el = this.element;
               userParam = o.rowTemplate;
               var rowTemp ="";
               if (_.isArray(userParam)) {
                    // each item in the array can be a  _.js template string.
                    rowTemp = '<tr>' + _.map(userParam, function (val) {return '<td>' + val + '</td>'} ).join('') + '</tr>';
                    o.rowTemplate = _.template(rowTemp);
                    //$.data(el, "rowTemplate", compiled);
               } else if (_.isString(userParam)) {
                    // strings are assumed to be _.js templates
                    o.rowTemplate =  _.template(userParam);
                    //$.data(el,"rowTemplate", compiled);
               } else if (_.isUndefined(userParam)) {
                    // undefined rowTemplates means we
                    // generate a simple row
                    var selectString = 'SELECT ' + o.rowFields;
                    var fromString = ' FROM ' + o.fusionTableId;
                    var whereString = ' WHERE ROWID = -1 ';
                    var sqlString = selectString + fromString + whereString;
                    sqlString = sqlString.replace(' ', '+');
                    //alert(queryString);
                    var queryUrl = "https://www.google.com/fusiontables/api/query?jsonCallback=?&sql=" + escape(sqlString);
                    $.getJSON(queryUrl, function(data, textStatus) {
                         // needs
                         var string = '<tr>' + _.map(data.table.cols, function (val, index) {return "<td><%= " + jsify(val) + " %></td>"} ).join('') + '</tr>';
                         //alert(string);
                         o.rowTemplate = _.template(string);
                     });

                } else if (_.isFunction(userParam)) {
                    // we're going to assume that a function is a _.js template
                    // if someone passes some other kind function, weirdness
                    // will ensue.
                    // No changes
               } else {
                    // for all edge cases we're going to just throw an error
                    throw "Bad row template value";  
               } 
          },
          // TO DO: need to refactor this with setupRowTemplate since
          // only arrays are handled differently, and they're not handled
          // at all yet
          _setupDetailsTemplate: function () { 
               o = this.options;
               el = this.element;
               userParam = o.detailsTemplate;
               if (_.isArray(userParam)) {
                    // each item in the array can be a field name or it can
                    // be an _.js template string. if it's anything else, it is
                    // simply ignored
                    // REMEMBER TO IMPLEMENT THIS LATER!!!!!!!!!!
               } else if (_.isString(userParam)) {
                    // strings are assumed to be _.js templates
                    compiled =  _.template(userParam);
               } else if (_.isUndefined(userParam)) {
                    // undefined rowTemplates are handled elsewhere and
                    // simply display raw data in tabular rows
               } else if (_.isFunction(userParam)) {
                    // we're going to assume that a function is a _.js template
                    // if someone passes some other kind function, weirdness
                    // will ensue.
               } else {
                    // for all edge cases we silently reset the option to
                    // undefined and set the rowTemplate data to undefined
                    userParam = undefined;
               }
               o.detailsTemplate = compiled;
          },
          _setupSearchFieldTemplate: function () {
               o = this.options
               o.searchFieldTemplate = _.template(o.searchFieldTemplate);
          },
          queryTable: function (type) {
               this._resetDataTable();
               this.showLoadingMessage();
               var self = this;
               var o = self.options;
               var el = self.element;
               var target = $("#fusionDataTable");
               var selectString = 'SELECT ' + o.rowFields + ', ROWID';
               var fromString = ' FROM ' + o.fusionTableId;
               var whereString = "";
               var orderString = " " + o.orderRowsBy;
               var fieldsArray = [];
               var inputWhereTemplate = _.template("'<%= key %>' CONTAINS IGNORING CASE '<%= value %>' ");
               var selectWhereTemplate = _.template("'<%= key %>' = '<%= value %>' ");
               // if it's a search query
               if (type == "query") {
                    //var whereItemTemplate = _.template("'<%= key %>' STARTS WITH '<%= value %>' ");
                    // read the search parameters from the generate inputs
                    $('.fusionSearchField').each( function (index) {
                         if ($(this).val() != "") {
                              if (this.nodeName.toLowerCase() == "input") {
                                   fieldsArray.push(inputWhereTemplate({key: $(this).attr("name"), value: $(this).val() }));
                              } else {
                                   fieldsArray.push(selectWhereTemplate({key: $(this).attr("name"), value: $(this).val() }));
                              }
                         }
                    });
                    // build the where string
                    if (fieldsArray.length > 0) {
                         whereString = ' WHERE ' + fieldsArray.join(' AND ');
                    } else {
                         //do nothing more
                    }
               } else {
                    //do nothing more
               }
               var sqlString = selectString + fromString + whereString + orderString;
               //alert(queryString);
               var queryUrl = 'https://www.googleapis.com/fusiontables/v1/query?sql='+
                escape(sqlString) + '&key=' + this.options.apiKey +' &callback=?';
               
               // query the data source with a callback
               $.getJSON(queryUrl, function(data, textStatus) {
                    // check for results, if none set the message and return
                    var cols = data.columns;
                    var templ = o.rowTemplate;
                    var rows = data.rows;
                    if (rows.length > 0) {
               
                         // write the table header
                         if (o.resultsHeaders) {
                              //for arrays map the headers into
                              if(_.isArray(o.resultsHeaders)) {
                                   headerString =  _.map(o.resultsHeaders, function (value) {return '<th>' + value + '</th>'} ).join('');
                              } else {
                                   //otherwise we assume it's a simple string
                                   headerString = o.resultsHeaders;
                              }
                         } else {
                              //if it's undefined, use the table headers from Google
                              headerString = _.map(cols, function (value) {return '<th>' + value + '</th>'} ).join('');
                         }
                         //alert(headerString);
                         target.append('<thead><tr>' + headerString + '</tr></thead>');
                    
                         // write the table rows
                         // need to deal with escaping column names 
                         var  dataObj =  {};
     
                         $.each(data.rows, function (index, row) {
                              var rowString;
                              $.each(cols, function (index, col) {
                                   var val = row[index];
                                   if (_.isNumber(val) && col != "rowid") {
                                             raw = val;
                                             ap = formatApNum(val);
                                             dollars = formatApNum(val, "$");
                                             dataObj[jsify(col)] = ap;
                                             dataObj[jsify(col + ' raw')] = raw;
                                             dataObj[jsify(col + ' ap')] = ap;
                                             dataObj[jsify(col+' dollars')] = dollars;
                                        } else {
                                        dataObj[jsify(col)] = val;

                                   }
                              });
                              
                              var rowString = $(templ(dataObj));
                              var headerString = o.detailsTitleTemplate(dataObj);
                              var fusiondmnParams = "'displayDetails', '" + headerString + "', '" + dataObj.rowid + "'";
                              // bind the link field to the displayDetails methods
                              $("td:eq(" + o.detailsField + ")", rowString).wrapInner('<a href="#row' + dataObj.rowid + '" onClick="$(' + "'#" + el.attr('id') + "'" + ').fusiondmn(' + fusiondmnParams + '); return false;"/>');
                              target.append(rowString);
     
     
                         });
                         self.clearLoadingMessage();
                    } else {
                         self.clearLoadingMessage();
                         self.showLoadingMessage("<div>No results.</div>");
                         
                    }
                    $("#fusionDataTable").tablesorter(); 


                });
               return false;
          },
          displayDetails: function ( header, rowId ) {
               //alert(rowId);
               var o = this.options;
               var target1 = $("#fusionDialog");
               var target2 = $("#fusionDialogText");


               // display the modal dialog with header loading message
               target1.dialog( "option", "title", header );
               target2.empty();
               target2.html("<p id=\"fusionDialogLoading\">Loading...</p>");
               $("#fusionDialogLoading").effect("pulsate", { times:100 }, 1000);
               target1.dialog("open");
               
               // generate the query
               var select = "SELECT " + o.detailsFields;
               var from = " FROM " + o.detailsTableId;
               var where = " WHERE ROWID='" + rowId + "'";
               var sqlString = select + from + where;


var queryUrl = 'https://www.googleapis.com/fusiontables/v1/query?sql='+
                escape(sqlString) + '&key=' + this.options.apiKey +' &callback=?';
               

               // query the data source with a callback
               $.getJSON(queryUrl, function(data, textStatus) {
                    var cols = data.columns;
                    var rows = data.rows;
                    // check for results, if none set an error message and return
                    
                    if (rows) {
                        
                         if (rows.length == 1) {
                              // create the dataObj
                              var row = rows[0];

                              var dataObj = {};
                              $.each(cols, function (index, col) {                                   //console.log(index);
                                   var val = row[index];
                                   if (_.isNumber(val)) {
                                        if (col != "rowid" ){
                                             raw = val;
                                             ap = formatApNum(val);
                                             dollars = formatApNum(val, "$");
                                             dataObj[jsify(col)] = ap;
                                             dataObj[jsify(col + ' raw')] = raw;
                                             dataObj[jsify(col + ' ap')] = ap;
                                             dataObj[jsify(col+' dollars')] = dollars;

                                        }
                                   } else {
                                        dataObj[jsify(col)] = val;

                                   }
                              });
                            
                            //write the header if it is blank
                            if(!header) {
                              newHeader = o.detailsTitleTemplate(dataObj);
                              target1.dialog( "option", "title", newHeader );
                            }
                            // write the content
                            target2.html(o.detailsTemplate(dataObj));
                         } else {
                              // write the error
                              target2.html('<p>Sorry there has been some kind of an error. Please search again.</p>');
                         }
                    } else {                         
                         // write the error
                         target2.html('<p>Sorry there has been some kind of an error. Please search again.</p>');
                    }
               });
               
          }
          
          
     });
     
     
     
     
     
     
     
     
     

})( jQuery );





// The format AP Num function takes any # and displays it in AP style.
// If a second paramter is passed, that is prepended to the result.
// e.g. formatApNum(1200000, "$") returns $1.2 million
//
// This might be better as part of a separate library/plugin but that's for
// later.
//
// Right now for numbers more than trillions it displays
// them in trillions and without commans. It would easy enough to extend to 
// include quadrillions, quintillions, etc. by following the same pattern.
// I'd accept a patch that does this and would probably do it if you asked
// nicely. There may be another good approach (I can think of a few), so I'm
// open to ideas.
//

//function formatApNum(amount, currencySymbol) {
//     if (currencySymbol) {
//          var symbol = currencySymbol;//e.g. $
//     } else {
//          var symbol = "";//no currency symbol
//     }
//     var absAmount = Math.abs(amount);//absolute value of amount
//     if (absAmount >= 1000000000000) {
//          var newAmount = amount/10000000000; //divide by 2 orders of magnitude less so we can can two decimal places later
//          var magnitude = "trillion";
//     } else if (absAmount >= 1000000000) {
//          var newAmount = amount/10000000 //divide by 2 orders of magnitude less so we can can two decimal places later
//          var magnitude = "billion";
//     } else if (absAmount >= 1000000) {
//          var newAmount = amount/10000 //divide by 2 orders of magnitude less so we can can two decimal places later
//          var magnitude = "million";
//     } else if (absAmount >= 1000) {
//          var newAmount = amount/10; //we're going to ignore this # later, but being consistent here
//          var magnitude = "thousands";
//     } else {
//          var newAmount = amount * 100;//0 - 999, multiply so that when we divide  later we get the original # back
//          var magnitude = ""; //no order of magnitude to display
//     }
//     newAmount = Math.round(newAmount)/100;
//     if (newAmount < 0) {
//          var sign = "-";
//     } else {
//          var sign = "";
//     }
//     if (magnitude == "thousands") { //they need to be handled a little differently
//          strNum = Math.abs(amount).toString();
//          strRight = strNum.substring(strNum.length-3);
//          strLeft = strNum.substring(0, strNum.length-3);
//          return sign + symbol + strLeft + "," + strRight;
//     } else if (amount == 0) {
//          return "&mdash;";
//     } else if (magnitude == "") {
//          if ((" " + Math.abs(newAmount)).length == 4) {
//               return  sign + symbol + Math.abs(newAmount) + "0";
//          } else {
//              return  sign + symbol + Math.abs(newAmount); 
//          }
//          
//     } else {
//          return  sign + symbol + Math.abs(newAmount) + " " + magnitude;
//     }
//
//
//}


function formatApNum(amount, currencySymbol) {
     if (currencySymbol) {
          var symbol = currencySymbol;//e.g. $
     } else {
          var symbol = "";//no currency symbol
     }
     var absAmount = Math.abs(amount);//absolute value of amount
     if (absAmount >= 1000000000000) {
          var newAmount = amount/10000000000; //divide by 2 orders of magnitude less so we can can two decimal places later
          var magnitude = "trillion";
     } else if (absAmount >= 1000000000) {
          var newAmount = amount/10000000 //divide by 2 orders of magnitude less so we can can two decimal places later
          var magnitude = "billion";
     } else if (absAmount >= 1000000) {
          var newAmount = amount/10000 //divide by 2 orders of magnitude less so we can can two decimal places later
          var magnitude = "million";
     } else if (absAmount >= 1000) {
          var newAmount = amount/10; //we're going to ignore this # later, but being consistent here
          var magnitude = "thousands";
     } else {
          var newAmount = amount * 100;//0 - 999, multiply so that when we divide  later we get the original # back
          var magnitude = ""; //no order of magnitude to display
     }
     newAmount = Math.round(newAmount)/100;
     if (newAmount < 0) {
          var sign = "-";
     } else {
          var sign = "";
     }
     if (magnitude == "thousands") { //they need to be handled a little differently
          var strNum = Math.abs(amount).toString();
          var strSuffix = ""
          if (strNum.match(/\./)){
               var arryNum = strNum.split('.');
               strNum = arryNum[0];
               if (arryNum[1].length >= 2) {
                    strSuffix = "." + arryNum[1].substring(0, 2);
               } else {
                     strSuffix = "." + arryNum[1] + "0";
               }
               
               
          }
          strRight = strNum.substring(strNum.length-3);
          strLeft = strNum.substring(0, strNum.length-3);
          return sign + symbol + strLeft + "," + strRight + strSuffix;
     } else if (magnitude == "") {
          var strNum = Math.abs(amount).toString();
          var strSuffix = ""
          if (strNum.match(/\./)){
               var arryNum = strNum.split('.');
               strNum = arryNum[0];
               if (arryNum[1].length >= 2) {
                    strSuffix = "." + arryNum[1].substring(0, 2);
               } else {
                     strSuffix = "." + arryNum[1] + "0";
               }
          }
          return sign + symbol + strNum + strSuffix;
     } else {
          return  sign + symbol + Math.abs(newAmount) + " " + magnitude;
     }


}


/**
 * Transform text into a valid javascript identifier:
 * spaces to underscores, remove non alnum
 * @param string text
 * adds a preceeding _ to things that begin with [0-9] for javascript
 * coolness
 * 
 * based on http://milesj.me/snippets/javascript/slugify
 */
function jsify(text) {
	text = text.replace(/[^-a-zA-Z0-9,&\s]+/ig, '');
	text = text.replace(/-/gi, '_');
	text = text.replace(/\s/gi, '_');
        if (text.match(/^[0-9]/) ){
          text = '_' + text;
        }
        //text = text.replace(/__+/gi, "_");
        //alert(text);
	return text;
}



//     THE MIT LICENSE
//
//     Permission is hereby granted, free of charge, to any person obtaining a
//     copy of this software and associated documentation files (the "Software"),
//     to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense,
//     and/or sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following conditions:
//     
//     The above copyright notice and this permission notice shall be included in
//     all copies or substantial portions of the Software.
//     
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//     AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//     DEALINGS IN THE SOFTWARE.
