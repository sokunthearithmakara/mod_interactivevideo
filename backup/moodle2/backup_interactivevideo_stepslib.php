<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Provides all the settings and steps to perform one complete backup of the activity
 *
 * @package    mod_interactivevideo
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class backup_interactivevideo_activity_structure_step extends backup_activity_structure_step {

    /**
     * Backup structure
     */
    protected function define_structure() {
        // To know if we are including userinfo.
        $userinfo = $this->get_setting_value('userinfo');

        // Define each element separated.
        $interactivevideo = new backup_nested_element('interactivevideo', ["id"], [
            'course',
            'name',
            'timecreated',
            'timemodified',
            'intro',
            'introformat',
            'videourl',
            'source',
            'video',
            'endscreentext',
            'displayasstartscreen',
            'start',
            'end',
            'completionpercentage',
            'grade',
            'type',
            'displayoptions',
        ]);

        $items = new backup_nested_element('items');
        $item = new backup_nested_element('item', ["id", "contentid"], [
            "timecreated",
            "timemodified",
            "courseid",
            "cmid",
            "annotationid",
            "timestamp",
            "title",
            "type",
            "displayoptions",
            "completiontracking",
            "contentid",
            "iframeurl",
            "content",
            'xp',
            'hascompletion',
            'advanced',
            'char1',
            'char2',
            'char3',
            'text1',
            'text2',
            'text3',
            'cbname',
            'cbcontextid',
            'cbcontenttype',
            'cbinstanceid',
            'cbconfigdata',
            'cbusercreated',
            'cbusermodified',
            'cbtimecreated',
            'cbtimemodified',
            'cbfilecontenthash',
        ]);

        // Build the tree.
        $interactivevideo->add_child($items);
        $items->add_child($item);

        // Define sources.
        $interactivevideo->set_source_table('interactivevideo', ['id' => backup::VAR_ACTIVITYID]);
        // We only want the contents that are relevant to the activity, not the whole contentbank.
        $item->set_source_sql(
            'SELECT ai.*, cc.name as cbname, cc.contextid as cbcontextid,
            cc.contenttype as cbcontenttype, cc.instanceid as cbinstanceid, cc.configdata as cbconfigdata,
            cc.usercreated as cbusercreated, cc.usermodified as cbusermodified, cc.timecreated as cbtimecreated,
            cc.timemodified as cbtimemodified, f.contenthash as cbfilecontenthash
            FROM {annotationitems} ai
            LEFT JOIN {contentbank_content} cc ON ai.contentid = cc.id
            LEFT JOIN {files} f ON ai.contentid = f.itemid  AND f.component = "contentbank" AND f.filearea = "public"
            AND f.mimetype IS NOT NULL
            WHERE ai.annotationid = :annotationid
            ORDER BY ai.id ASC',
            ['annotationid' => backup::VAR_ACTIVITYID]
        );

        $item->annotate_ids('user', 'cbusercreated');
        $item->annotate_ids('user', 'cbusermodified');

        if ($userinfo) {
            $completiondata = new backup_nested_element('completiondata');
            $completion = new backup_nested_element('completion', ["id"], [
                "timecreated",
                "timecompleted",
                "completionpercentage",
                "userid",
                "completeditems",
                "xp",
            ]);

            $interactivevideo->add_child($completiondata);
            $completiondata->add_child($completion);
            $completion->set_source_table('annotation_completion', ['cmid' => backup::VAR_ACTIVITYID], 'id ASC');

            // Define id annotations.
            $completion->annotate_ids('user', 'userid');
        }

        // Define file annotations.
        $interactivevideo->annotate_files('mod_interactivevideo', 'intro', null); // This file area hasn't itemid.
        $interactivevideo->annotate_files('mod_interactivevideo', 'endscreentext', null);
        $interactivevideo->annotate_files('mod_interactivevideo', 'video', null);
        // Contentbank content is at course level, so we must indicate the course context id.
        $item->annotate_files('contentbank', 'public', 'contentid', context_course::instance($this->task->get_courseid())->id);
        $item->annotate_files('mod_interactivevideo', 'content', 'id'); // Itemid is the id of the annotationitem.

        // Return the root element (interactivevideo), wrapped into standard activity structure.
        return $this->prepare_activity_structure($interactivevideo);
    }
}
