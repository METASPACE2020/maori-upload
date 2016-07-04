import React from 'react'
import qq from 'fine-uploader/lib/s3'
import $ from 'jquery'
import 'fine-uploader/lib/rows.css'
import Cookies from 'js-cookie'


class S3FineUploader extends React.Component {
    constructor (props) {
        super(props);
        this._fine_uploader = null;
    }

    uploadValidate() {
        var fnames = this._fine_uploader.getUploads().map((x) => x.name);

        if (fnames.length < 2) {
            alert(qq.format("Please choose 2 files for upload"));
            return false;
        }

        if (fnames[0].split('.').slice(0, -1)[0] != fnames[1].split('.').slice(0, -1)[0]) {
            alert(qq.format("Please choose 2 files with the same base name but different extensions"));
            return false;
        }

        return true;
    }

    resetFineUploader() {
        this._fine_uploader.reset();
    }

    componentDidMount() {
        const fineUploaderComponent = this;

        this._fine_uploader = new qq.s3.FineUploader({
            element: this.refs.s3fu,
            template: 'qq-template-manual-trigger',
            request: {
                endpoint: 'sm-engine-upload.s3.amazonaws.com',
                accessKey: 'AKIAJN65WGJHXJQXMIEA'
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
                        let fileNames = this.getUploads().map(obj => obj.originalName);
                        fineUploaderComponent.props.setFilesUploaded(fileNames);
                    }
                    else {
                        console.log('Failed file IDs: ', failed);
                    }
                }
            }
        });

        $('#trigger-upload').click(() => {
            if (this.uploadValidate()) {
                this._fine_uploader.uploadStoredFiles();
                this.props.setShowMetadataForm(true);
            }
        });
    }

    render() {
        return <div ref='s3fu'>Upload!</div>
    }
}

export default S3FineUploader;
