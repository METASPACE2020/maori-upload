export default function validate(formData, errors) {
    function runChecks(validator, paths, errorDisplayIndex, subObj=(x) => x) {
        const field = (f) => (typeof f === 'string') ? (o) => o[f] : f;
        paths = paths.map(field);
        subObj = field(subObj);
        const data = paths.map((path) => path(subObj(formData)));
        let formErrors = paths[errorDisplayIndex](subObj(errors));
        validator(...data).forEach((e) => formErrors.addError(e));
    }

    runChecks(validateOrganismPart,
              ['Organism', 'Organism_Part'], 1,
              'Sample_Information');

    runChecks(validateGrowthConditions,
              ['Sample_Growth_Conditions', 'Organism'], 0,
              'Sample_Information');

    runChecks(validateMaldiMatrix, [
        (x) => x.Sample_Preparation.MALDI_Matrix,
        (x) => x.MS_Analysis.Ionisation_Source
    ], 0);

    runChecks(validateMaldiMatrixApplication, [
        (x) => x.Sample_Preparation.MALDI_Matrix_Application,
        (x) => x.MS_Analysis.Ionisation_Source
    ], 0);

    return errors;
}

function validateOrganismPart(organism, organismPart) {
    let errors = [];
    const plants = new Set(["Arabidopsis_thaliana_(thale_cress)"]);
    const notPlants = new Set([
        "Homo_sapiens_(Human)",
        "Mus_musculus_(Mouse)",
        "Rattus_norvegicus_(Rat)",
        "Danio_rerio_(Zebrafish)"
    ]);
    const plantParts = new Set(["Leaf", "Stem", "Root"]);
    const notPlantParts = new Set([
        "Brain",
        "Kidney",
        "Eye",
        "Liver",
        "Ovary",
        "Pancreas",
        "Lung",
        "Lymph_Node",
        "Testis"
    ]);
    if ((plants.has(organism) && notPlantParts.has(organismPart)) ||
        (notPlants.has(organism) && plantParts.has(organismPart)))
    {
        errors = ["is not part of " + organism];
    }
    return errors;
}

function validateGrowthConditions(growthCondition, organism) {
    let errors = [];
    const notHumanConditions = new Set([
        "Cultured_2D",
        "Cultured_3D",
        "Caged"
    ]);
    const notCulturable = new Set([
        "Homo_sapiens_(Human)",
        "Mus_musculus_(Mouse)",
        "Rattus_norvegicus_(Rat)",
        "Danio_rerio_(Zebrafish)",
        "Arabidopsis_thaliana_(thale_cress)"
    ]);
    const notCageable = new Set([
        "Homo_sapiens_(Human)",
        "Danio_rerio_(Zebrafish)",
        "Arabidopsis_thaliana_(thale_cress)"
    ]);

    if ((organism == "Homo_sapiens_(Human)" && notHumanConditions.has(growthCondition)) ||
        (growthCondition.startsWith("Cultured") && notCulturable.has(organism)) ||
        (growthCondition == "Caged" && notCageable.has(organism)))
    {
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
