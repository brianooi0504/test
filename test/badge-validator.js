function validateAndConvert() {
  const input = document.getElementById('input');
  const resultDiv = document.getElementById('result');

  if (input.files.length > 0) {
    const file = input.files[0];
    const imageURL = URL.createObjectURL(file);

    verifyBadge(imageURL)
      .then((result) => {
        resultDiv.innerText = result;
      })
      .catch((error) => {
        resultDiv.innerText = 'Validation Error: \n' + error.message;
      });
  } else {
    resultDiv.innerText = 'Please select a PNG file.';
  }
}

// Validate Badge Function
function verifyBadge(imageURL) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  var message = '';
  var errors = 0;
  var errorFlags = [0,0,0]

  // Load the image
  const img = new Image();
  img.src = imageURL;

  return new Promise((resolve, reject) => {
    img.onload = function handleLoad() {
      const width = img.width;
      const height = img.height;

      // Check if size is 512x512
      if (width !== 512 || height !== 512) {
        errors += 1;
        errorFlags[0] = 1
        message += 'Image size is not 512x512.\n';
        
        // Resize 
        resizeImage(imageURL)
          .then((resizedImage) => {
            console.log('Resized Image Object:', resizedImage);
          })
          .catch((error) => {
            console.error('Resize Error:', error.message);
          });
      }

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
      const radius = width / 2;

      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % width;
        const y = Math.floor(i / 4 / width);

        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

        // Check if pixel is outside the circle and not fully transparent
        if (distance > radius+2 && data[i + 3] !== 0) {
          // console.log(i, x, y, distance, radius, data[i+3])
          errors += 1;
          errorFlags[1] = 1
          message += 'Nontransparent pixels must be within a circle.\n';
          break;
        }
      }

      // Change shape 
      if (errorFlags[1] == 1) {
        cropToCircle(imageURL)
        .then((croppedImage) => {
          console.log('Cropped Image Object:', croppedImage);
        })
        .catch((error) => {
          console.error('Cropping Error:', error.message);
        });
      }

      // Check if colors give a "happy" feeling (with less than two dark RGB component)
      var red = 0;
      var green = 0;
      var blue = 0;
      var darkColorCount = 0;
      var colorThreshold = 100
      
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

      console.log(red, green, blue, darkColorCount)
      
      // Check if color is bright and happy
      if (darkColorCount > 1) {
        errors += 1;
        errorFlags[2] = 1
        message += 'Colors must give a "happy" feeling.\n';
        
        // Change color
        changeAverageRGB(imageURL, [red, green, blue], colorThreshold)
          .then((result) => {
            console.log('Modified Image Object:', result);
          })
          .catch((error) => {
            console.error('Modification Error:', error.message);
          });
      }

      //console.log(errorFlags)

      if (errors > 0) {
        reject(new Error(message)); 
      }
      
      // All checks passed, resolve the promise
      resolve('Badge is valid.');
    };

    // Handle image loading errors
    img.onerror = function () {
      reject(new Error('Error loading image.'));
    };
  });
}

function resizeImage(imageURL) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  const targetSize = 512

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
      reject(new Error('Error loading image.'));
    };

    img.src = imageURL;
  });
}

function cropToCircle(imageURL) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  return new Promise((resolve, reject) => {
    img.onload = function () {
      const { width, height } = img;

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw the original image on the canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Get image data
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Center coordinates of the circle
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY);

      // Iterate through pixels and make pixels outside the circle transparent
      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % width;
        const y = Math.floor(i / 4 / width);

        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

        // If pixel is outside the circle, make it transparent
        if (distance > radius) {
          data[i + 3] = 0; // Set alpha (transparency) to 0
        }
      }

      // Update canvas with modified image data
      ctx.putImageData(imageData, 0, 0);

      // Get base64 representation of the cropped image
      const base64CroppedImage = canvas.toDataURL('image/png');

      // Resolve with the base64 cropped image
      resolve({ base64CroppedImage });
    };

    img.onerror = function () {
      reject(new Error('Error loading image.'));
    };

    img.src = imageURL;
  });
}

function changeAverageRGB(imageURL, rgbAvg, colorThreshold) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  const changes = [Math.ceil(colorThreshold - rgbAvg[0]), Math.ceil(colorThreshold - rgbAvg[1]), Math.ceil(colorThreshold - rgbAvg[2])]

  return new Promise((resolve, reject) => {
    img.onload = function () {
      const { width, height } = img;

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw the original image on the canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Get image data
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Modify RGB values
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

      // Update canvas with modified image data
      ctx.putImageData(imageData, 0, 0);

      // Get base64 representation of the modified image
      const base64ModifiedImage = canvas.toDataURL('image/png');

      // Resolve with the base64 modified image
      resolve({ base64ModifiedImage });
    };

    img.onerror = function () {
      reject(new Error('Error loading image.'));
    };

    img.src = imageURL;
  });
}

