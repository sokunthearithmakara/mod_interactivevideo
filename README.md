# Interactive Video #

Add interactions to your videos with this plugin including html content, external link (iframe), and interactive content H5P.

This plugin allows instructors to engage students by adding interactions to their YouTube videos.

Main features:
- Add interactions to your videos including html content, external link (iframe), and interactive content H5P.
- Support three display modes: inline (covering the video), popup (modal), and below the video.
- Set the start and end time of the video.
- Distraction free - hide YouTube video controls and prevent students from going to YouTube.
- Set manual or automatic completion of the interaction. Automatic completion is only applicable to H5P content that emits xAPI statements (completed and answered).
- Set activity completion based on the completion of the interaction.
- Support grades based on the interactions completed.
- Display completion reports.

Limitations:
- Only YouTube videos are supported at the moment.
- H5P content state is not saved. The content will be reset when the page is reloaded. However, the completion status will be saved.
- No mobile app support.

## Installing via uploaded ZIP file ##

1. Log in to your Moodle site as an admin and go to _Site administration >
   Plugins > Install plugins_.
2. Upload the ZIP file with the plugin code. You should only be prompted to add
   extra details if your plugin type is not automatically detected.
3. Check the plugin validation report and finish the installation.

## Installing manually ##

The plugin can be also installed by putting the contents of this directory to

    {your/moodle/dirroot}/mod/interactivevideo

Afterwards, log in to your Moodle site as an admin and go to _Site administration >
Notifications_ to complete the installation.

Alternatively, you can run

    $ php admin/cli/upgrade.php

to complete the installation from the command line.

## License ##

2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
this program.  If not, see <https://www.gnu.org/licenses/>.
