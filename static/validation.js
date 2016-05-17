function validate(formData, errors) {
    console.log(formData);
    console.log(errors);
    const sampleInformation = formData.Sample_Information;
    const organism = sampleInformation.Organism;
    const organismPart = sampleInformation.Organism_Part;
    const growthCondition = sampleInformation.Sample_Growth_Conditions;
    const organismPartErrors = validateOrganismPart(organism, organismPart);
    for (let i = 0; i < organismPartErrors.length; i++) {
        errors.Sample_Information.Organism_Part.addError(organismPartErrors[i]);
    }
    const growthConditionErrors = validateGrowthConditions(growthCondition, organism);
    for (let i = 0; i < growthConditionErrors.length; i++) {
        errors.Sample_Information.Sample_Growth_Conditions.addError(growthConditionErrors[i]);
    }

    const samplePrep = formData.Sample_Preparation;
    const matrix = samplePrep.MALDI_Matrix;
    const application = samplePrep.MALDI_Matrix_Application;
    const source = formData.MS_Analysis.Ionisation_Source;
    var maldiMatrixErrors = validateMaldiMatrix(matrix, source);
    for (let i = 0; i < maldiMatrixErrors.length; i++) {
        errors.Sample_Preparation.MALDI_Matrix.addError(maldiMatrixErrors[i]);
    }
    var maldiMatrixApplicationErrors = validateMaldiMatrixApplication(application, source);
    for (let i = 0; i < maldiMatrixApplicationErrors.length; i++) {
        errors.Sample_Preparation.MALDI_Matrix_Application.addError(maldiMatrixApplicationErrors[i]);
    }
    return errors;
}

function validateOrganismPart(organism, organismPart) {
    let errors = [];
    const plants = ["Arabidopsis_thaliana_(thale_cress)"];
    const notPlants = [
        "Homo_sapiens_(Human)",
        "Mus_musculus_(Mouse)",
        "Rattus_norvegicus_(Rat)",
        "Danio_rerio_(Zebrafish)"
    ];
    const plantParts = ["Leaf", "Stem", "Root"];
    const notPlantParts = [
        "Brain",
        "Kidney",
        "Eye",
        "Liver",
        "Ovary",
        "Pancreas",
        "Lung",
        "Lymph_Node",
        "Testis"
    ];
    if ((plants.indexOf(organism) !== -1 && notPlantParts.indexOf(organismPart) !== -1) ||
        (notPlants.indexOf(organism) !== -1 && plantParts.indexOf(organismPart) !== -1)) {
        errors = ["is not part of " + organism];
    }
    return errors;
}

function validateGrowthConditions(growthCondition, organism) {
    let errors = [];
    const notHumanConditions = [
        "Cultured_2D",
        "Cultured_3D",
        "Caged"
    ];
    const notCulturable = [
        "Homo_sapiens_(Human)",
        "Mus_musculus_(Mouse)",
        "Rattus_norvegicus_(Rat)",
        "Danio_rerio_(Zebrafish)",
        "Arabidopsis_thaliana_(thale_cress)"
    ];
    const notCageable = [
        "Homo_sapiens_(Human)",
        "Danio_rerio_(Zebrafish)",
        "Arabidopsis_thaliana_(thale_cress)"
    ];
    if ((organism == "Homo_sapiens_(Human)" && notHumanConditions.indexOf(growthCondition) !== -1) || 
        (["Cultured_2D", "Cultured_3D"].indexOf(growthCondition) !== -1 && notCulturable.indexOf(organism) !== -1) || (growthCondition == "Caged" && notCageable.indexOf(organism) !== -1)) {
        errors.push("not applicable for " + organism);
    }
    return errors;
}

function validateMaldiMatrix(matrix, source) {
    if (source !== "MALDI" && matrix !== "none") {
        return ["Cannot have matrix without MALDI as the ionization source"];
    } else {
        return [];
    }
}

function validateMaldiMatrixApplication(application, source) {
    if (source !== "MALDI" && application !== "none") {
        return ["Cannot have matrix application without MALDI as the ionization source"];
    } else {
        return [];
    }
}

export default validate;
