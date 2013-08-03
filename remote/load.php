<?php

require_once 'include/autoload.php';

$db = new Database();
$db->setup();
$db->connOpen();

function insert($db) {
	/**
	 * INSERT
	 * 1. Create Job record
	 * 2. Get Last Inserted ID
	 * 3. Create n Labels records with ID as Forigen Key
	 * 4. Check inserted rows
	 */
	$now = new DateTime();
	$dates = date('Y-m-d H:i:s', $now->getTimestamp());
	$jobName = $db->escape('Шпаклевка Клей 0.5, 1.5');
	$jobSQL = "INSERT INTO jobs (date_created,date_modified,name,roll,separations,template)
		VALUES ('$dates', '$dates', '$jobName' , 2, 'CMYK', '4090354')";
	$db->query($jobSQL);
	$link = $db->getLastId();

	$labels = array();
	$labels[] = 'Y:\d00\001\spaklevka_08_klei.eps';
	$labels[] = 'Y:\d00\002\spaklevka_1_5_klei.eps';
	$labels[] = 'Y:\d00\003\spaklevka_1_5_klei.eps';
	$labels[] = 'Y:\d00\004\spaklevka_08_klei.eps';
	$labels[] = 'Y:\d00\005\spaklevka_1_5_klei.eps';
	$labels[] = 'Y:\d00\006\spaklevka_08_klei.eps';
	$labels[] = 'Y:\d00\007\spaklevka_1_5_klei.eps';
	$labels[] = 'Y:\d00\008\spaklevka_08_klei.eps';

	$labelsSQL = "INSERT INTO labels (date_created,date_modified,name,fk_jobs) VALUES ";

	foreach ($labels as $l) {
		$path = "'" . $db->escape($l) . "'";
		$label = "('$dates', '$dates', $path, $link),";
		$labelsSQL .= $label;
	}
	$query = preg_replace('/,$/', ';', $labelsSQL);
	$db->query($query);

	$db->connClose();
}

/**
 * UPDATE
 */
/**
 * DELETE
 */

/**
 * SELECT
 * 1. Select all jobs where status = 'go' and deleted = 0;
 * 2. Return XML
 */

function select($db) {
	$jobsSQL = "SELECT * FROM jobs WHERE status='go' AND deleted = 0;";
	$jobs = $db->query($jobsSQL);
	/**
	 * Create XML Response 
	 */
	$result = new DOMDocument();
	$result->encoding = 'UTF-8';
	$result->formatOutput = TRUE;
	$result->appendChild(new DOMElement('joblist'));
	foreach ($jobs as $job) {
		$jobid = $job['id'];
		$jobNode = $result->createElement('job');
		$jobNode->setAttribute('job_id', $jobid);
		$jobNode->appendChild(new DOMElement('hotfolder',$job['separations']));
		$jobNode->appendChild(new DOMElement('rollnumber',$job['roll']));
		$jobNode->appendChild(new DOMElement('template',$job['template']));
		$print_list = $jobNode->appendChild(new DOMElement('print_list'));
		/**
		 * Fetch print-list's
		 */
		$labelsSQL = "SELECT * FROM labels WHERE fk_jobs = $jobid AND deleted = 0;";
		$print_list_files = $db->query($labelsSQL);
		foreach ($print_list_files as $plf) {
			$print_list->appendChild(new DOMElement('label',$plf['name']));
		}
		$result->documentElement->appendChild($jobNode);
	}
	$result->save('/tmp/job.xml');
	$db->connClose();
}

// Enaf! insert($db);
$jobs = select($db);
?>
