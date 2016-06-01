import domready from 'domready'
import React from 'react'
import { render } from 'react-dom'
import Form from 'react-jsonschema-form'
import $ from 'jquery'
import customValidation from './validation'
import S3FineUploader from './upload.jsx'

const LOCAL_STORAGE_KEY = "latestMetadataSubmission";

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

    hasCustomValue() {
        // if onChange event has been fired, state must reflect it
        // otherwise the value must have been set from localStorage
        if (this.state)
            return this.state['hasCustomValue'];
        else
            return this.props.options.map(opt => opt.value).indexOf(this.props.value) < 0;
    }

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

      if (this.hasCustomValue()) {
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
          <option key={-1} value={customValueIdentifier}>
              {customValueIdentifier}
          </option>
          </select>
          {customValueInput}
        </div>
      );
    }
}

const MetadataForm = (props) => (
  <Form {...props} />
);

class App extends React.Component {

    constructor (props) {
        super(props);
        this.state = {
            showMetadataForm: false
        }
    }

    setShowMetadataForm(showMetadataForm) {
        this.setState({'showMetadataForm': showMetadataForm});
    }

    onMetadataFormSubmit({formData}) {
        if (this._uploader.uploadValidate())
        {
            let xmlhttp = new XMLHttpRequest();
            xmlhttp.open("POST", "/submit");
            xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            xmlhttp.send(JSON.stringify(formData));
            console.log(xmlhttp.response);
            if (typeof Storage !== "undefined") {
              const serializedFormData = JSON.stringify(formData);
              localStorage.setItem(LOCAL_STORAGE_KEY, serializedFormData);
            } else {/* not supported by browser */}

            alert("Thank you for submitting your datasets to METASPACE. We will follow up soon. " +
                "Please don't reload the page until the uploading is finished");

            this.setShowMetadataForm(false);
        }
    }

    render() {
        var metadataForm;
        if (this.state.showMetadataForm) {
            metadataForm = <MetadataForm onSubmit={this.onMetadataFormSubmit.bind(this)} {...this.props}/>
        }

        return (
            <div style={{width: '80%', maxWidth: '1000px', padding: '50px'}}>
                <S3FineUploader ref={x => this._uploader = x} setShowMetadataForm={this.setShowMetadataForm.bind(this)} />
                { metadataForm }
            </div>
        )
    }
}

/**
 * Extract filename from file path (without extension)
 */
function getFilename(path) {
    const fn = path.replace(/^.*[\\\/]/, '');
    return fn.substr(0, fn.lastIndexOf('.'));
}

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
                let result = Object.assign({}, schema);
                if (schema['required'])
                    result['minLength'] = 1;
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

    if (typeof Storage !== "undefined") {
        const previousSubmission = localStorage.getItem(LOCAL_STORAGE_KEY);
        console.log(previousSubmission);
        const parsedFormData = JSON.parse(previousSubmission);
        console.log(parsedFormData);
        render(<App schema={schema}
                    formData={parsedFormData}  // can handle null
                    uiSchema={uiSchema}
                    validate={customValidation}
                    validationSchema={validationSchema}/>,
               document.getElementById("app-container"));
    } else {/* not supported by browser */}

    $('legend').click( function() {
        $(this).siblings().toggle();
        return false;
    });
});
