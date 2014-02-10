/**
 * Created by Aran Mulholland on 9/02/2014.
 */

var arraySupport = (function(){

    function firstOrNull(array, iteratorFunction){
        var i,
            arrayLength = array.length,
            returnValue = null;

        if (arrayLength == 0) {
            return null;
        }

        if (iteratorFunction == undefined) {
            return array[0];
        }

        for (i = 0; i < arrayLength && returnValue === null; i++) {
            if (iteratorFunction(array[i]) === true) {
                returnValue = array[i];
            }
        }
        return returnValue;
    }

    return {
        firstOrNull: firstOrNull
    };

})();


module.exports = arraySupport;