export default class Animation {
    static MaskFlags =  {
        None: 0,
        SetMask: 1,
        ObeyMask: 2,
        ClearMask: 4
    }; 

    static BlendMode = {
        Normal: 0,
        Normal_Alternative: 1,
        Layer: 2,
        Multiply: 3,
        Screen: 4,
        Lighten: 5,
        Darken: 6,
        Difference: 7,
        Add: 8,
        Subtract: 9,
        Invert: 10,
        Alpha: 11,
        Erase: 12,
        Overlay: 13,
        Hardlight: 14,
        PreMultiplied: 15
    }; 

    static ExtendedFilterAndBlendState = {
        None: 0,
        ColorMatrixFilter: 1 << 0,
        // Define other flags
    };
}