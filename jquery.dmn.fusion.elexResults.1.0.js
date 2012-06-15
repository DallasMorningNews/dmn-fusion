/*
elexResults() accesses a Fusion table of election results
end writes it into a standardized block of html.
Options are:
     elementId: in jQuery style
    jurisdiction - sets jurisdiction, defaults to *
    office - sets office, defaults to *
    table - sets results table, required or throws error
  
by Daniel Lathrop dlathrop@dallasnews.com

version 1.0

for example data structure see:
https://www.google.com/fusiontables/DataSource?docid=1Db2-owJtmFqstL--6GkWIlHwMt-5r-ymMgOWwT8

copyright (c) 2012 The Dallas Morning News

released for use under the MIT License

*/



function ensurejQuery() {
    if (typeof jQuery == 'undefined') {
        var script = document.createElement('script');
        script.type = "text/javascript";
        script.src = "https://ajax.googleapis.com/ajax/libs/jquery/1.5.2/jquery.min.js";
        document.getElementsByTagName('head')[0].appendChild(script);
    }
}

ensurejQuery();



function extender (destination,source) {
    for (var property in source)
        destination[property] = source[property];
    return destination;
}



function elexResult(options) {
    //try {
    //    var tableId = ftTableId;
    //} catch(err) {
    //    var tableId = false;
    //}
    //try {
    //    var apiKey = ftApiKey;
    //} catch(err) {
    //    var apiKey = false;
    //}
    var defaultOptions = {
        // passing each race separately leads to a slightly goofy
        // FT ordering issue
        // Either need to do each race separately, or separate
        // in the JS code.
        // Hmmmm.
        elementId: 'body', //default election results
        jurisdiction: '%', // jurisdiction (e.g. Irving)
        office: '%', //office (e.g. City Council)
        position: '%', //position (e.g. District 1)
        showAllMugs: false,
        order_by: 'ORDER+BY+Votes+DESC',
        maxRows: 100000 //essentially == infinity for our purposes
        
        }
    
    if (typeof options == 'object') {
            options = extender(defaultOptions, options);
    } else {
            options = defaultOptions;
    }
    if (options.table && options.apiKey) {
        //console.log(options.order_by);
        //console.log(options.table);
        //console.log(options.jurisdiction);
        var sql = 'SELECT+Candidate,+Jurisdiction,+Office,+Position,+\'Position+Number\',+Percent, Reporting, Called, Mug+FROM+'+
            options.table + '+' +
            'WHERE+Jurisdiction+LIKE+\''+
            escape(options.jurisdiction) + '\'+' +
            'AND+Office+LIKE+\''+
            escape(options.office) +'\'+' +
            'AND+\'Position\'+STARTS+WITH+\''+
            escape(options.position)+'\'+' +
            //options.order_by;
            'ORDER+BY+Votes+DESC';
        var url = 'https://www.googleapis.com/fusiontables/v1/query?sql='+
                sql+ '&key=' + options.apiKey +' &callback=?';
        $.ajax( {url: url,
                    dataType: "jsonp",
                    cache: false,
                    success:  function (data) {writeResults(data, options)},
                    failure: function(){alert('sorry, something has gone wrong. please reload the page.');}
                    });        
    } else {
        alert("required table ID or API key option required");
    }

}

function writeResults(data, options) {
    var race = '';
    if (options.jurisdiction != '%') {
        race = race + options.jurisdiction + ' ';
    }
    if (options.office != '%') {
        race = race + options.office + ' ';
    }
    if (options.position != '%') {
        race = race + '<br>' + options.position;
    }
    var html = '<div>' + race + '</div><br/>';
    
    
    var el = $(options.elementId);
    rows = data.rows;
    //console.log(rows);
    var reportPct=0;
    var i = 0;
    $.each(rows, function (index, row) {
        if (i < options.maxRows) {
            if (row[7] == 'W' || row[7] == 'R') {
                var barClass = 'elex-bar';
                var pctClass= 'elex-percent';
                var check = '<span class="elex-winner"><img src="http://www.dallasnews.com/resrsc/images/winner-check.png" /></span>';
            } else if (row[7]=='L') {
                var barClass = 'elex-barloser';
                var pctClass= 'elex-percentloser';
                var check = '';
            } else {
                var barClass = 'elex-bar';
                var pctClass= 'elex-percent';
                var check = '';
            }
            reportPct = row[6];
            //console.log(row);
            html+= '<!-- begin ' + row[0] + '-->';
            if (index==0||options.showAllMugs) {
                html+= '<img src="' + row[8] +'" class="left">';
            }
            html+= '<p>'+row[0]+'<br /></p>';
            html+= check;
            html+= '<span class"'+pctClass+'">' + Math.round(row[5] * 100) + '%</span>';
            html+= '<div class="elex-bar"><span style="width:'+ Math.round(row[5] * 100)+'%;"></span></div>';
            //html+= '<br/><br/>';
        }
        i++;
    });
    html+='<div class="elex-returns">with '+Math.round(reportPct*100)+'% of precincts reporting</div>'
    el.append(html);
    
}

function sorter(a,b) {
    alert(a[2]);
    if (a[3]> b[3]){
        return 1;
    } else if (a[3] == b[3] && a[4] > b[4])  {
        return 1;
    } else if (a[3] == b[3] && a[4] < b[4])  {
        return -1;
    } else if (a[3] == b[3] && a[4] == b[4])  {
        return 0;
    } else {
        return -1;
    }
}


