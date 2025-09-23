let nodeIds = {
    'list1': {
        'type': 'select',
        'options': {
            '': 'Sélectionner le service bénéficaire',
            'list1_001': 'CERIS',
            'list1_002': 'Tutorat / Apprentis',
            'list1_003': 'Tronc commun / Missions terrain',
            'list1_004': 'Direction de la recherche',
            'list1_005': 'Autres',
        },
        'attributes': {
            'required': ''
        }
    },
    'list2': {
        'type': 'select',
        'options': {
            '': 'Sélectionner une option',
            'list2_001': 'Commun (si aucune autre possibilité)',
            'list2_002': 'I3A (UMR)',
            'list2_003': 'I3A (hors UMR)',
            'list2_004': 'ISOAR (LSR)',
            'list2_005': 'ISOAR (hors LSR)',
            'list2_006': 'PFM',
            'list2_007': 'Projet',
        },
        'attributes': {
            'required': ''
        }
    },
    'list3': {
        'type': 'select',
        'options': {
            '': 'Sélectionner un type de véhicule',
            'list3_001': 'Véhicule personnel',
            'list3_002': 'Véhicule administratif',
            'list3_003': 'Co-voiturage',
            'list3_004': 'Véhicule de location',
        },
        'attributes': {}
    },
    'list4': {
        'type': 'select',
        'options': {
            '': 'Sélectionner une équipe',
            'list4_001': 'MIB',
            'list4_002': 'PIAS',
            'list4_003': 'LAC',
            'list4_004': 'AXES'
        },
        'attributes': {
            'required': ''
        }
    },
    'list5': {
        'type': 'select',
        'options': {
            '': 'Sélectionner une équipe',
            'list5_001': 'Aléa',
            'list5_002': 'Vulnérabilité',
            'list5_003': 'Systèmes',
            'list5_004': 'Crise'
        },
        'attributes': {
            'required': ''
        }
    },
    'list6': {
        'type': 'select',
        'options': {
            '': 'Sélectionner un transport',
            'list6_001': 'Avion',
            'list6_002': 'Bateau',
            'list6_003': 'Location de véhicule',
            'list6_004': 'Navette (aéroport...)',
            'list6_005': 'Route (co-voiturage...)',
            'list6_006': 'Train',
            'list6_007': 'Taxi',
            'list6_0071': 'Urbain',
            'list6_008': 'Véhicule personnel',
            'list6_009': 'Véhicule de service',
        },
        'attributes': {
            'required': ''
        }
    },
    'detail1': {
        'type': 'detail',
        'elements': [
            {
                'type': 'input',
                'attributes': {
                    'type': 'text',
                    'placeholder': 'Nom du projet',
                    'required': ''
                }
            }
        ]
    },
    'detail2': {
        'type': 'detail',
        'elements': [
            {
                'type': 'input',
                'attributes': {
                    'type': 'text',
                    'placeholder': "Numéro d'immatriculation",
                    'required': ''
                }
            }
        ]
    },
    'detail3': {
        'type': 'detail',
        'elements': [
            {
                'type': 'input',
                'attributes': {
                    'type': 'text',
                    'placeholder': "Nom de l'apprenti",
                    'required': ''
                }
            },
            {
                'type': 'select',
                'attributes': {
                    'required': ''
                },
                'options': {
                    '': 'Sélectionner un parcours',
                    'opt1': 'CMC',
                    'opt2': 'INFRES',
                    'opt3': 'MKX',
                }
            }

        ]                
    },
    'detail4': {
        'type': 'detail',
        'elements': [
            {
                'type': 'input',
                'attributes': {
                    'type': 'text',
                    'placeholder': "Nom de l'élève",
                    'required': ''
                }
            },
            {
                'type': 'input',
                'attributes': {
                    'type': 'text',
                    'placeholder': 'Nom de la société',
                    'required': ''
                }
            },
            {
                'type': 'select',
                'attributes': {
                    'required': ''
                },
                'options': {
                    '': 'Sélectionner une année',
                    'opt1': '1A',
                    'opt2': '2A',
                    'opt3': '3A',
                }
            }
        ]
    },
    'detail5': {
        'type': 'detail',
        'elements': [
            {
                'type': 'input',
                'attributes': {
                    'type': 'text',
                    'placeholder': 'Description',
                    'required': ''
                }
            }
        ]
    },
    'detail6': {
        'type': 'detail',
        'elements': [
            {
                'type': 'textarea',
                'attributes': {
                    'placeholder': "Indiquer la ville, la date et l'heure de départ et d'arrivée",
                    'rows': '3',
                    'required': ''
                }
            }
        ]
    },
};

let NODE_LINKS = {
    'list1_001': 'list2',
    'list2_002': 'list4',
    'list2_004': 'list5',
    'list2_007': 'detail1',
    'list3_001': 'detail2',
    'list1_002': 'detail3',
    'list1_003': 'detail4',
    'list1_005': 'detail5',
    'list3_004': 'detail6',
    'list6_008': 'detail2'
};