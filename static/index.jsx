import domready from 'domready'
import React from 'react'
import { render } from 'react-dom'
import Form from 'react-jsonschema-form'
import $ from 'jquery'

const SelectOrFreeTextWidget = ({
  id, options, placeholder,
  value, required, onChange
}) => {
  let customValueInput;
  let selectValue = value;

  const customValueIdentifier = 'Other...'

  if (options.map(opt => opt.value).indexOf(value) == -1) {
    customValueInput = (
      <input className="form-control"
           value={value == customValueIdentifier ? '' : value}
           placeholder="Enter custom value"
           style={{marginTop: '5px'}}
           required={required}
           onChange={e => onChange(e.target.value)}></input>
    );
    selectValue = customValueIdentifier;
  }

  // the rest is essentially a copy-paste from react-jsonschema-form SelectWidget code
  return (
    <div>
      <select
        id={id}
        className="form-control"
        title={placeholder}
        value={selectValue}
        required={required}
        onChange={(e) => {onChange(e.target.value);}}>
      {
        options.map(({value, label}, i) => {
          return <option key={i} value={value}>{label}</option>;
        })
      }
      <option key={-1} value={customValueIdentifier}>{customValueIdentifier}</option>
      </select>
      {customValueInput}
    </div>
  );
}

const DatasetUploadForm = () => (
  <div>
    <form enctype="multipart/form-data" action="/submit" method="POST">
      <fieldset>
        <legend>Dataset submission</legend>

        <div className="form-group field">
          <label class="control-label" for="imzml_file">imzML file</label>
          <input type="file" name="imzml_file"/>

          <label class="control-label" for="ibd_file">ibd file</label>
          <input type="file" name="ibd_file"/>
        </div>
      </fieldset>
    </form>
  </div>
);

const MetadataForm = ({schema, uiSchema, onSubmit}) => (
  <Form schema={schema}
        uiSchema={uiSchema}
        onSubmit={onSubmit}/>
);

const onMetadataFormSubmit = ({formData}) => {
  console.log(formData)
};

const App = (props) => (
  <div style={{width: '80%', maxWidth: '1000px', padding: '50px'}}>
    <DatasetUploadForm />
    <MetadataForm onSubmit={onMetadataFormSubmit} {...props} />
  </div>
);

function getUISchema(schema) {
    switch (schema.type) {
        case 'object':
            let result = {};
            for (var prop in schema.properties)
                result[prop] = getUISchema(schema.properties[prop]);
            return result;
        case 'string':
            if ('enum' in schema) {
                let options = schema['enum'];
                if (options[options.length - 1].startsWith('Other')) {
                    schema['enum'] = options.slice(0, options.length - 1);
                    return {"ui:widget": SelectOrFreeTextWidget};
                }
            }
            return undefined;
        default:
            return undefined;
    }
}

domready(() => {

    let schema = require("./schema.json");
    let uiSchema = getUISchema(schema); // modifies enums with 'Other => ...'

    render(<App schema={schema}
                uiSchema={uiSchema}/>,
           document.getElementById("app-container"));

    $('legend').click( function() {
        $(this).siblings().toggle();
        return false;
    });

  /*
  document.getElementById('submit').addEventListener('click', function () {
    editor.setOption('show_errors','always');
    if (editor.validate().length > 0)
      return;

    var data_form = document.forms[0];
    if (data_form.elements["imzml_file"].value && data_form.elements["ibd_file"].value) {
      var xmlhttp = new XMLHttpRequest();
      xmlhttp.open("POST", "/submit");
      xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xmlhttp.send(JSON.stringify(editor.getValue()));
      console.log(xmlhttp.response);
      data_form.submit();
    } else {
      alert("Please select the files to upload");
    }

  });*/

});
