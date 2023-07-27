include("Tektronix.js")
include("CalGeneral.js")

// Channels
UsePort = 1;
sic_gd_filter_points = 50;
sic_gd_filter_factor = 5;

function TEK_GD_Init(Port)
{
	TEK_PortInit(Port, 9600);
	TEK_Send("data:width 1");
	TEK_Send("data:encdg rpb");
	TEK_Send("data:start 1");
	TEK_Send("data:stop 2500");
}

function TEK_Init(PortTek,UsePort)
{

	if (UsePort < 1 || UsePort > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	TEK_GD_Init(PortTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{

		if (i == UsePort)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	
}

function GetChannelData(Channel) 
{

	// read basic data
	var p_scale = TEK_Exec("ch" + Channel + ":scale?");
	var p_position = TEK_Exec("ch" + Channel + ":position?");

	// init data read
	TEK_Send("data:source ch" + Channel);

	// read curve
	var data_input = TEK_Exec("curve?");
	print("Channel " + Channel + " loaded");

	// validate data
	if ((data_input[0] != "#") || (data_input[1] != 4) || (data_input[2] != 2) ||
		(data_input[3] != 5) || (data_input[4] != 0) || (data_input[5] != 0))
	{
		print("Invalid CH" + Channel + " data.");
		return;
	}

	// adjust data
	var res = [];
	for (var i = 6; i < 2506; ++i)
		res[i - 6] = ((data_input[i].charCodeAt(0) - 128 - p_position * 25) * p_scale / 25)*10000;
	
	return res;
}

function SaveChannelData(NameFile, Data)
{
save(cgen_correctionDir + "/" + NameFile + ".csv", Data);
}

function ChannelData(NameFile, Channel)
{
	var Data = [];
	Data = (GetChannelData(Channel));
	SaveChannelData(NameFile, Data);
}


function SiC_GD_Filter(NameFile, ScaleI)
{
	var Data = [];
	Data = load(cgen_correctionDir + "/" + NameFile + ".csv");
	var filtered_avg = [];
	var filtered_spl = [];
	
	// avg filtering
	for (var i = 0; i < (Data.length - Math.pow(sic_gd_filter_points, 2)); ++i)
	{
		var avg_point = 0;
		for (var j = i; j < (i + Math.pow(sic_gd_filter_points, 2)); j += sic_gd_filter_points)
			avg_point += Data[j];
		filtered_avg[i] = avg_point / sic_gd_filter_points;
	}
	
	// current shunt scale
	var scale
	if (typeof ScaleI === 'undefined')
		scale = 1;
	else
		scale = ScaleI;
	
	// spline filtering
	for (var i = 0; i < (filtered_avg.length - 3); ++i)
	{
		filtered_spl[i] =	Math.pow(1 - sic_gd_filter_factor, 3) * filtered_avg[i] +
							3 * sic_gd_filter_factor * Math.pow(1 - sic_gd_filter_factor, 2) * filtered_avg[i + 1] +
							3 * Math.pow(sic_gd_filter_factor, 2) * (1 - sic_gd_filter_factor) * filtered_avg[i + 2] +
							Math.pow(sic_gd_filter_factor, 3) * filtered_avg[i + 3];
		
		filtered_spl[i] *= scale;
	}
	
	return filtered_spl;

}

function Fil_Data(NameFile,ScaleI,FilFile)
{
	var FilData = [];
	FilData = (SiC_GD_Filter(NameFile, ScaleI));
	SaveChannelData(FilFile, FilData);
}


function Derivative(NameFile,DerFile)
{
	Der = [];
	Load = [];
	K = 4 * 1e-2;

	Load = load(cgen_correctionDir + "/" + NameFile + ".csv");

	for (var N = 2; N < 2500; ++N)
	{	
		Der.push((Load[N] - Load[N-1])/K);
	}
	save(cgen_correctionDir + "/" + DerFile + ".csv", Der);
}