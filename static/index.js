var domready = require("domready");

domready(function() {

  var JSONEditor;
  //  https://github.com/jdorn/json-editor/issues/309
  try {
      require('json-editor');
      JSONEditor = window.JSONEditor;
  } catch(ex) {}

  JSONEditor.defaults.theme = "bootstrap3";
  JSONEditor.defaults.iconlib = "fontawesome4";

  function post(path, params, method) {
      method = method || "post"; // Set method to post by default if not specified.

      // The rest of this code assumes you are not using a library.
      // It can be made less wordy if you use one.
      var form = document.createElement("form");
      form.setAttribute("method", method);
      form.setAttribute("action", path);

      for (var key in params) {
          if (params.hasOwnProperty(key)) {
              var hiddenField = document.createElement("input");
              hiddenField.setAttribute("type", "hidden");
              hiddenField.setAttribute("name", key);
              hiddenField.setAttribute("value", params[key]);

              form.appendChild(hiddenField);
          }
      }

      document.body.appendChild(form);
      form.submit();
  }

  var editor = new JSONEditor(document.getElementById('editor_holder'), {
      ajax: true,
      schema: {
          $ref: "/static/schema.json",
          format: "grid"
      }
  });

  document.getElementById('submit').addEventListener('click', function () {
      var xmlhttp = new XMLHttpRequest();
      xmlhttp.open("POST", "/submit");
      xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xmlhttp.send(JSON.stringify(editor.getValue()));
  });

});
