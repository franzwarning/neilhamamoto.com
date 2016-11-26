$(document).ready(function() {

    const SLASH = '/';
    var basePath = 'assets/folders/';
    var currentPath = 'assets/folders/about/ArtistStatement.txt'; // assets/folders/
    var response = null;
    var filedescriptions = null;
    var hasSelected = false;
    var currentDepth = 2; // 1
    var cursorDepth = 2; // 1
    var currentIndex = 0; // 0

    // Is the file a folder?
    function isFolder(file) {
        return file.endsWith(SLASH);
    }

    // Get the name of the file
    function fileName(file, relativeTo) {
        file = file.substring(relativeTo.length);
        if (isFolder(file)) {
            return file.substring(0, file.indexOf(SLASH));
        } else {
            return file.substring(file.lastIndexOf(SLASH) + 1);
        }
    }

    // see how deep a path is
    function getDepthOfPath(path, folder) {
        if (path == basePath) return 1;
        var restOfPath = path.substring(basePath.length);
        return (restOfPath.match(/\//g) || []).length + 1;//(folder ? 1 : 0);
    }

    // get the path up to a certain depth
    function getCurrentPathAtDepth(depth) {
        if (depth >= currentDepth) return null;
        var parts = currentPath.split(SLASH);
        var totalString = parts[0] + SLASH + parts[1] + SLASH
        for (var i = 0; i < depth; i++) {
            totalString += parts[i + 2] + SLASH;
        }
        return totalString;
    }

    // Determine if a file is in a folder
    function inFolder(file, parent) {
        if (!file.startsWith(parent) || file === parent) return false;

        var restOfFile = file.substring(parent.length);

        if (isFolder(file)) {
            var firstPart = restOfFile.substring(0, restOfFile.indexOf(SLASH) + 1);

            if (restOfFile.length === firstPart.length) {
                return true;
            } else {
                return false;
            }
        } else {
            return restOfFile.indexOf(SLASH) === -1;
        }
    }

    function isImage(file) {
        file = file.toLowerCase();
        if (file.endsWith('.jpeg') || file.endsWith('.jpg') || file.endsWith('.png')) return true;
        return false;
    }

    function isText(file) {
        file = file.toLowerCase();
        if (file.endsWith('.txt')) return true;
        return false;
    }

    // Build the column object
    function columnForPath(path, depth) {
        return '<div class="column noselect" data-path="' + path + '" data-depth="' + depth + '"><div class="js-show-files files"></div></div>';
    }

    // Get the description from the file list
    function descriptionForPath(path) {
        for (item of filedescriptions) {
            if (item['path'] === path) {
                return item['desc'];
            }
        }
    }

    // Build the preview object
    function previewForPath(path) {
        var url = 'http://neilhamamoto.com/' + path;
        var name = fileName(path, path.substring(0, path.lastIndexOf(SLASH)));
        var contentDiv = '';
        if (isImage(name)) {
            // use img
            contentDiv = '<img class="content" src="' + url + '"/>';
        } else if (isText(name)) {
            // use iframe
            $.ajax({
                url: url,
                dataType: 'text',
                success: function(data) {
                    $('.text-content').text(data);
                }
            });

            contentDiv = '<div class="text-content"></div>';
        } else {
            // default behavior
        }

        var description = descriptionForPath(path);
        if (description == undefined) description = '';

        return '<div class="column preview noselect">' + contentDiv +'<div class="text">' + name + '</div><div class="text description">' + description + '</div></div>';
    }

    // Build the file object
    function fileNameDiv(file, isFolder, depth, count, path) {
        var className = isFolder ? 'js-folder' : 'js-file';

        if (isFolder && currentDepth > 1) {
            var pathAtDepth = getCurrentPathAtDepth(depth + 1);
            if (pathAtDepth) {
                pathAtDepth = pathAtDepth.substring(0, pathAtDepth.lastIndexOf(SLASH));
                var lastPath = pathAtDepth.substring(pathAtDepth.lastIndexOf(SLASH) + 1);
                if (lastPath === file) {
                    className += ' in-path';
                }
            }
        }

        if (path === currentPath) {
            className += ' selected'
        }

        return '<div class="filename ' + className + '" data-index="' + count + '" data-path="' + path + '"><div class="text">' + file + '</div></div>';
    }

    // Redraw the finder
    function recalculateLayout() {
        $('.content-window').empty();

        var oldDepth = currentDepth;

        // if the current path is a folder show one more column
        if (isFolder(currentPath) && hasSelected) currentDepth = getDepthOfPath(currentPath, true);
        else currentDepth = getDepthOfPath(currentPath, false);

        console.log('Old Depth: '  + oldDepth);
        console.log('Current Depth: ' + currentDepth);

        for (var i = 0; i < currentDepth; i++) {
            var path = getCurrentPathAtDepth(i);
            var column = columnForPath(path, i+1);

            $('.content-window').append(column);
            var $column = $('.column[data-path="' + path + '"]');

            $column.find('.js-show-files').empty();

            var filesToShow = [];
            var count = 0;
            $(response).find('Contents').each(function() {
                var file = $(this).find('Key').text();
                if (inFolder(file, path)) {
                    $column.find('.js-show-files').append(fileNameDiv(fileName(file, path), isFolder(file), i, count, file));
                    count++;
                }
            });
        }

        if (!isFolder(currentPath)) {
            $('.content-window').append(previewForPath(currentPath));
        }

        if (currentDepth > oldDepth || !isFolder(currentPath)) {
            $('.content-window').animate({scrollLeft: $('.content-window').scrollLeft() + 210}, 200);
        }

        printDebug();

    }

    function numRowsAtDepth(depth) {
        return $('.column[data-depth="' + depth + '"]').find('.js-show-files > .filename').length;
    }

    $.getJSON('http://neilhamamoto.com/assets/filedescriptions.json', function(json) {
        filedescriptions = json;
        $.ajax({
            url: 'http://neilhamamoto.com.s3-us-west-1.amazonaws.com?prefix=assets/folders',
            success: function(res) {
                response = res;
                recalculateLayout();
            }
        });
    });

    $(document).on('click', '.filename', function(e) {
        e.preventDefault();

        var folder = $(e.target).closest('.column').data('path');
        var $file = $(e.target).closest('.filename');
        currentPath = $file.data('path');
        currentIndex = $file.data('index');
        cursorDepth =  $(e.target).closest('.column').data('depth')

        hasSelected = true;
        recalculateLayout();
    });

    // Watch for arrow keys
    $(document).on('keydown', function(e) {
        var key = e.which || e.keyCode || 0;
        var validKey = false;

        // up
        if (key == 38) {
            validKey = true;
            if (currentIndex > 0) {
                currentIndex--;
            }
        }

        // down
        if (key == 40) {
            validKey = true;

            // get the max index at the current depth
            var numItems = numRowsAtDepth(cursorDepth);
            if ((currentIndex + 1) < numItems && hasSelected) {
                currentIndex++;
            }
        }

        // left
        if (key == 37) {
            validKey = true;
            if (cursorDepth > 1) {
                cursorDepth--;
                currentIndex = $('.column[data-depth="' + cursorDepth + '"]').find('.js-show-files > .filename.in-path').index();
            }
        }

        // right
        if (key == 39) {
            validKey = true;
            if (cursorDepth < currentDepth && numRowsAtDepth(currentDepth) > 0) {
                currentIndex = 0;
                cursorDepth++;
            }
        }

        if (!validKey) return;
        e.preventDefault();

        currentPath = $('.column[data-depth="' + cursorDepth + '"]').find('.js-show-files > .filename').eq(currentIndex).data('path');
        hasSelected = true;
        recalculateLayout();
    });

    function printDebug() {
        $('.js-info').html('Current depth: ' + currentDepth + '<br />Cursor depth: ' + cursorDepth + '<br />Current Index: ' + currentIndex + '<br />Current Path: ' + currentPath);
    }


});
