function validateAndConvert() {
    const input = document.getElementById('input');
    const output = document.getElementById('outputImage');
    const resultDiv = document.getElementById('result');
  
    if (input.files.length > 0) {
      const file = input.files[0];
      const imageURL = URL.createObjectURL(file);
      
      verifyBadge(imageURL)
        .then((result) => {
          resultDiv.innerText = result.displayMessage;

          // Display the final image
          output.src = result.finalImg;
        })
        .catch((error) => {
          resultDiv.innerText = 'Error: ' + error.message + '\n';
        });
  
    } else {
      resultDiv.innerText = 'Please select a PNG file.';
    }
  }
  
// Validate Badge Function
function verifyBadge(imageURL) {
var displayMessage = '';

// Load the image
const img = new Image();

return new Promise((resolve, reject) => {
    img.onload = function () {
    const width = img.width;
    const height = img.height;
    const targetSize = 512
    const colorThreshold = 100;

    // Check if size is 512x512
    if (width !== targetSize || height !== targetSize) {
        displayMessage += 'Image size is not 512x512.\n';
        
        // Resize 
        resizeImage(imageURL, targetSize)
        .then((resizedImage) => {
            displayMessage += 'Image size is 512x512.\n';

            // console.log('Resized Image Object:', resizedImage.base64ResizedImage);

            // Continue processing with the resized image
            return checkCircle(resizedImage.base64ResizedImage);
        })
        .then((circleCheckedImage) => {
            displayMessage += circleCheckedImage.message;

            return checkColor(circleCheckedImage.base64CroppedImage, colorThreshold);
        })
        .then((finalResult) => {
            const finalImg = finalResult.base64ColoredImage
            displayMessage += finalResult.message;
            resolve({ finalImg, displayMessage });
        })
        .catch((error) => {
            reject(error);
        });
    } else {
        displayMessage += 'Image size is 512x512.\n';

        // Process the image directly
        checkCircle(imageURL)
        .then((circleCheckedImage) => {
            displayMessage += circleCheckedImage.message;
            
            return checkColor(circleCheckedImage.base64CroppedImage, colorThreshold);
        })
        .then((finalResult) => {
            const finalImg = finalResult.base64ColoredImage
            displayMessage += finalResult.message;
            resolve({ finalImg, displayMessage });
        })
        .catch((error) => {
            reject(error);
        });
    }
    };
    
    img.onerror = function () {
        reject(new Error('Error loading image.'));
    };

    img.src = imageURL;

    });
}
  
function checkCircle(imageURL) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    var error = 0;
    var message = "";
    
    return new Promise((resolve, reject) => {
        img.onload = function () {
            const width = img.width;
            const height = img.height;

            // Set canvas dimensions
            canvas.width = width;
            canvas.height = height;

            // Draw the image on the canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Get image data
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // Check if nontransparent pixels are within a circle
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(centerX, centerY);

            for (let i = 0; i < data.length; i += 4) {
                const x = (i / 4) % width;
                const y = Math.floor(i / 4 / width);

                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

                // Check if pixel is outside the circle and not fully transparent
                // If pixel is outside the circle, make it transparent
                if (distance > radius+2 && data[i + 3] !== 0) {
                    // console.log(i, x, y, distance, radius, data[i+3])
                    error = 1;
                    data[i + 3] = 0; // Set alpha (transparency) to 0
                }
            }

            if (error == 1) {
                message += 'Nontransparent pixels must be within a circle.\n';
            }
            
            message += 'Nontransparent pixels are within a circle.\n';

            // Update canvas with modified image data
            ctx.putImageData(imageData, 0, 0);

            // Get base64 representation of the cropped image
            const base64CroppedImage = canvas.toDataURL('image/png');

            // Resolve with the base64 cropped image
            resolve({ base64CroppedImage, message });
        };

        img.onerror = function () {
            reject(new Error('Error loading image to check for circle.'));
        };

        img.src = imageURL;
    });
}
  
function checkColor(imageURL, colorThreshold) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    var message = "";
    
    return new Promise((resolve, reject) => {
        img.onload = function () {
            const width = img.width;
            const height = img.height;

            // Set canvas dimensions
            canvas.width = width;
            canvas.height = height;

            // Draw the image on the canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Get image data
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // Check if colors give a "happy" feeling (with less than two dark RGB component)
            var red = 0;
            var green = 0;
            var blue = 0;
            var darkColorCount = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                red += data[i];
                green += data[i + 1];
                blue += data[i + 2];
            }

            red = red / ((data.length) / 4)
            green = green / ((data.length) / 4)
            blue = blue / ((data.length) / 4)

            if (red < colorThreshold) { darkColorCount += 1 } ;
            if (green < colorThreshold) { darkColorCount += 1 };
            if (blue < colorThreshold) { darkColorCount += 1 };

            // console.log(red, green, blue, darkColorCount)

            const changes = [Math.ceil(colorThreshold - red), Math.ceil(colorThreshold - green), Math.ceil(colorThreshold - blue)]

            // Check if color is bright and happy
            if (darkColorCount > 1) {
                message += 'Colors must give a "happy" feeling.\n';
                
                // Change color
                for (let i = 0; i < data.length; i += 4) {
                    if (changes[0] > 0) {
                        data[i] = data[i] + changes[0]; // Set new red value
                    }
                    if (changes[1] > 0) {
                        data[i + 1] = data[i + 1] + changes[1]; // Set new green value
                    }
                    if (changes[2] > 0) {
                        data[i + 2] = data[i + 2] + changes[2]; // Set new blue value
                    }
                }
            } 
            
            message += 'Colors give off a "happy" feeling.\n';

            // Update canvas with modified image data
            ctx.putImageData(imageData, 0, 0);

            // Get base64 representation of the cropped image
            const base64ColoredImage = canvas.toDataURL('image/png');

            // Resolve with the base64 cropped image
            resolve({ base64ColoredImage, message });
        };

        // Handle image loading errors
        img.onerror = function () {
            reject(new Error('Error loading image to check for color.'));
        };

        img.src = imageURL;
    });
}
 
function resizeImage(imageURL, targetSize) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    return new Promise((resolve, reject) => {
        img.onload = function () {
            const { width, height } = img;

            // Determine the scaling factor for resizing
            const scaleFactor = targetSize / Math.max(width, height);

            // Set canvas dimensions to the target size
            canvas.width = targetSize;
            canvas.height = targetSize;

            // Draw the image on the canvas with the new size
            ctx.drawImage(img, 0, 0, width * scaleFactor, height * scaleFactor);

            // Get base64 representation of the resized image
            const base64ResizedImage = canvas.toDataURL('image/png');

            // Resolve with the base64 resized image
            resolve({ base64ResizedImage });
        };

        img.onerror = function () {
            reject(new Error('Error loading image to be resized.'));
        };

        img.src = imageURL;
    });
}