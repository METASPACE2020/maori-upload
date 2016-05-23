import domready from 'domready'
import React from 'react'
import { render } from 'react-dom'
import Form from 'react-jsonschema-form'
import $ from 'jquery'
import customValidation from './validation'
import S3FineUploader from './upload'

/*
   Default form validation figures out that custom values for enums
   are not valid according to the JSON schema.

   We monkey-patch Form class to use another schema for validation,
   which differs from the original in that 'enum' entries are just deleted.
*/
const defaultFormValidate = Form.prototype.validate;
Form.prototype.validate = function(formData, schema) {
    console.log(formData);
    return defaultFormValidate.call(this, formData,
                                    this.props.validationSchema);
};

class SelectOrFreeTextWidget extends React.Component {
render() {
  /*
     <select> element is responsible for checking if the value is 'Other';
     if it is, it sets this.state.hasCustomValue to true
     and then fires an onChange event
  */
  const {id, options, placeholder,
         value, required, onChange} = this.props;

  let customValueInput;
  let selectValue = value;

  const customValueIdentifier = 'Other...'

  if (this.state && this.state['hasCustomValue']) {
    customValueInput = (
      <input className="form-control"
           value={value}
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
        onChange={(e) => {
          let val = e.target.value;
          if (val == customValueIdentifier) {
            this.setState({'hasCustomValue': true}, () => onChange(''));
          } else {
            this.setState({'hasCustomValue': false}, () => onChange(val));
          }
        }}>
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
}}

/*const DatasetUploadForm = () => (
  <div>
    <form id="upload-form"
          action="/submit"
          method="post"
          encType="multipart/form-data">
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
);*/

const MetadataForm = (props) => (
  <Form {...props} />
);

const onMetadataFormSubmit = ({formData}) => {
  /*const data_form = document.getElementById('upload-form');
  if (data_form.elements["imzml_file"].value &&
      data_form.elements["ibd_file"].value)*/
  if (upload_validate())
  {
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/submit");
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send(JSON.stringify(formData));
    console.log(xmlhttp.response);
    data_form.submit();
  } else {
    alert("Please select the files to upload");
  }
};

const App = (props) => (
  <div style={{width: '80%', maxWidth: '1000px', padding: '50px'}}>
    {/*<DatasetUploadForm />*/}
    <S3FineUploader />
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

function getValidationSchema(schema) {
    switch (schema.type) {
        case 'object':
            let result = {};
            for (var prop in schema.properties)
                result[prop] = getValidationSchema(schema.properties[prop]);
            return Object.assign({}, schema, {"properties": result});
        case 'string':
            if ('enum' in schema) {
                let result = Object.assign({}, schema, {'minLength': 1});
                delete result['enum']
                return result;
            }
            return schema;
        default:
            return schema;
    }
}

domready(() => {
    let schema = require("./schema.json");
    let uiSchema = getUISchema(schema); // modifies enums with 'Other => ...'
    let validationSchema = getValidationSchema(schema);
    console.log(validationSchema)

    render(<App schema={schema}
                uiSchema={uiSchema}
                validate={customValidation}
                validationSchema={validationSchema}/>,
           document.getElementById("app-container"));

    $('legend').click( function() {
        $(this).siblings().toggle();
        return false;
    });
});
