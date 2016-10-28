import React from 'react'
import qq from 'fine-uploader/lib/s3'
import $ from 'jquery'
import 'fine-uploader/lib/rows.css'


class S3FineUploader extends React.Component {
    constructor (props) {
        super(props);
        this._fine_uploader = null;
        this.filesUploaded = [];
    }

    getFileNames() {
        return this._fine_uploader.getUploads().map((x) => x.name);
    }

    uploadValidate() {
        let fnames = this.getFileNames();
        if (fnames.length < 2) {
            alert(qq.format("Please choose 2 files for upload"));
            return false;
        }

        // consider only the last two selected files
        let [first, second] = [fnames.slice(-2)[0], fnames.slice(-1)[0]];
        let [fext, sext] = [first.split('.').slice(-1)[0], second.split('.').slice(-1)[0]];
        let [fbn, sbn] = [first.split('.').slice(0, -1).join("."), second.split('.').slice(0, -1).join(".")];
        if (fext == sext || fbn != sbn) {
            alert("Incompatible file names! Please select 2 files with the same name but different extension");
            return false;
        }
        return true;
    }

    initFineUploader() {
        const fineUploaderComponent = this;

        this._fine_uploader = new qq.s3.FineUploader({
            element: this.refs.s3fu,
            template: 'qq-template-manual-trigger',
            request: {
                endpoint: `${this.config.aws.s3_bucket}.s3.amazonaws.com`,
                accessKey: this.config.aws.accees_key_id
            },
            autoUpload: false,
            objectProperties: {
                key: (id) => `${sessionStorage.getItem('session_id')}/${this._fine_uploader.getFile(id).name}`
            },
            signature: {
                endpoint: '/s3/sign'
            },
            iframeSupport: {
                localBlankPagePath: "/server/success.html"
            },
            multiple: true,
            cors: {
                expected: true
            },
            chunking: {
                enabled: true,
                concurrent: {
                    enabled: true
                }
            },
            resume: {
                enabled: true
            },
            validation: {
                itemLimit: 2,
                allowedExtensions: ["imzML", "ibd"]
            },
            callbacks: {
                onComplete: function(id, name, response) {
                    if (response.success) {
                        console.log('Uploaded: ' + name);
                    }
                    else
                      console.log('Failed: ' + name);
                },
                onAllComplete: function (succeeded, failed) {
                    if (failed.length == 0) {
                        fineUploaderComponent.filesUploaded = this.getUploads().map(obj => obj.originalName);
                    }
                    else {
                        console.log('Failed file IDs: ', failed);
                    }
                }
            }
        });

        $('#trigger-upload').click(() => {
            if (this.uploadValidate()) {
                $('#thanks_message').empty();
                fineUploaderComponent.props.setShowMetadataForm(true);
                let dsName = fineUploaderComponent.getFileNames()[0].replace(/\.[^/.]+$/, "");
                fineUploaderComponent.props.setDatasetName(dsName);
                this._fine_uploader.uploadStoredFiles();
            }
        });
    }

    resetFineUploader() {
        this.initFineUploader();
    }

    componentDidMount() {
        $.get('/config.json', function (result) {
            this.config = result;
            this.initFineUploader();
        }.bind(this));
    }

    render() {
        return <div ref='s3fu'>Upload!</div>
    }
}

export default S3FineUploader;
